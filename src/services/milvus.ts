import { DataType, MilvusClient } from '@zilliz/milvus2-sdk-node';
import { getEmbeddings } from './gemini.service';

const MILVUS_HOST = 'localhost:19530';

const COLLECTION_NAME = 'learnability_sources';
const DIMENSION = 768;
const client = new MilvusClient({ address: MILVUS_HOST });

(async () => {
  try {
    console.log('[MilvusService] Initializing Milvus connection, collection, and index...');
    await createCollection();
    await createIndex();
    console.log('[MilvusService] Milvus collection and index initialized successfully.');
  } catch (error) {
    console.error('[MilvusService] Error initializing Milvus:', error);
  }
})();

export async function insertEmbeddings(
  documents: any,
  userId: string,
  metadata: {
    subjectId?: string;
    dataSourceId: string;
  }
) {
  console.log(`[MilvusService] Inserting embeddings for user: ${userId}, dataSource: ${metadata.dataSourceId}, subject: ${metadata.subjectId || 'N/A'}`);
  try {
    for (const doc of documents) {
      console.log(`[MilvusService] Getting embedding for document chunk...`);
      const embedding = await getEmbeddings(doc.pageContent);
      if (!embedding) continue;

      const enhancedMetadata = {
        ...doc.metadata,
        subjectId: metadata.subjectId || null,
        dataSourceId: metadata.dataSourceId,
      };

      await client.insert({
        collection_name: COLLECTION_NAME,
        data: [
          {
            text: doc.pageContent,
            embedding,
            metadata: enhancedMetadata,
            user_id: userId,
            subject_id: metadata.subjectId || '',
            data_source_id: metadata.dataSourceId,
          },
        ],
      });

      console.log(`[MilvusService] Inserted chunk for dataSource: ${metadata.dataSourceId}`);
    }
    console.log(`[MilvusService] Finished inserting ${documents.length} embeddings for dataSource: ${metadata.dataSourceId}`);
  } catch (error) {
    console.error(`[MilvusService] Error inserting embeddings for user ${userId}, dataSource ${metadata.dataSourceId}:`, error);
  }
}

export async function searchMilvus(
  queryText: string,
  userId: string,
  options: {
    topK?: number;
    subjectId?: string;
    dataSourceIds?: string[];
  } = {}
) {
  console.log(`[MilvusService] Searching Milvus for query: "${queryText}", user: ${userId}, options:`, options);
  try {
    const collections = await client.showCollections();
    if (!collections.data.some((c) => c.name === COLLECTION_NAME)) {
      console.log(`[MilvusService] Collection ${COLLECTION_NAME} doesn't exist yet. Cannot search.`);
      return [];
    }

    try {
      console.log(`[MilvusService] Loading collection ${COLLECTION_NAME}...`);
      await client.loadCollection({ collection_name: COLLECTION_NAME });
      console.log(`[MilvusService] Collection ${COLLECTION_NAME} loaded.`);
    } catch (error) {
      console.error(`[MilvusService] Error loading collection ${COLLECTION_NAME}:`, error);
      return [];
    }

    const { topK = 2, subjectId, dataSourceIds } = options;

    console.log('[MilvusService] Getting query embeddings...');
    const queryEmbedding = await getEmbeddings(queryText);
    if (!queryEmbedding) {
      console.log('[MilvusService] Failed to generate query embedding.');
      return [];
    }

    let filter = `user_id == "${userId}"`;

    if (dataSourceIds && dataSourceIds.length > 0) {
      const dataSourceFilter = dataSourceIds.map((id) => `data_source_id == "${id}"`).join(' || ');
      filter += ` && (${dataSourceFilter})`;
    } else {
      if (subjectId) filter += ` && subject_id == "${subjectId}"`;
    }

    console.log(`[MilvusService] Using search filter: ${filter}`);

    try {
      console.log(`[MilvusService] Performing search with topK=${topK}...`);
      const searchResults = await client.search({
        collection_name: COLLECTION_NAME,
        vector: queryEmbedding,
        limit: topK,
        metric_type: 'COSINE',
        filter: filter,
      });

      if (!searchResults || searchResults.results.length === 0) {
        console.log('[MilvusService] No results found with the specified filter.');
        if (dataSourceIds && dataSourceIds.length > 0) {
          if (subjectId) {
            console.log('[MilvusService] Falling back to subject-based search as dataSource search yielded no results.');
            return await searchMilvus(queryText, userId, { topK, subjectId });
          }
        }
        return [];
      }

      console.log(`[MilvusService] Found ${searchResults.results.length} results.`);
      return searchResults.results.map((result) => ({
        text: result.text,
        score: result.score,
        metadata: result.metadata,
      }));
    } catch (error) {
      if ((error as Error).toString().includes('IndexNotExist')) {
        console.log('[MilvusService] Index not found, attempting to create it...');
        await createIndex();

        try {
          const searchResults = await client.search({
            collection_name: COLLECTION_NAME,
            vector: queryEmbedding,
            limit: topK,
            metric_type: 'COSINE',
            filter: filter,
          });

          if (!searchResults || searchResults.results.length === 0) {
            return [];
          }

          return searchResults.results.map((result) => ({
            text: result.text,
            score: result.score,
            metadata: result.metadata,
          }));
        } catch (retryError) {
          console.error('[MilvusService] Error retrying search after creating index:', retryError);
          return [];
        }
      }
      console.error('[MilvusService] Error searching Milvus:', error);
      return [];
    }
  } catch (error) {
    console.error('[MilvusService] General error in searchMilvus:', error);
    return [];
  }
}

export async function deleteEmbeddingsByDataSource(dataSourceId: string) {
  console.log(`[MilvusService] Deleting embeddings for data source: ${dataSourceId}`);
  try {
    await client.loadCollection({ collection_name: COLLECTION_NAME });

    await client.deleteEntities({
      collection_name: COLLECTION_NAME,
      filter: `data_source_id == "${dataSourceId}"`,
    });

    console.log(`[MilvusService] Successfully deleted embeddings for data source: ${dataSourceId}`);
  } catch (error) {
    console.error(`[MilvusService] Error deleting embeddings for data source ${dataSourceId}:`, error);
  }
}

export async function deleteEmbeddingsBySubject(subjectId: string) {
  console.log(`[MilvusService] Deleting embeddings for subject: ${subjectId}`);
  try {
    await client.loadCollection({ collection_name: COLLECTION_NAME });

    await client.deleteEntities({
      collection_name: COLLECTION_NAME,
      filter: `subject_id == "${subjectId}"`,
    });

    console.log(`[MilvusService] Successfully deleted embeddings for subject: ${subjectId}`);
  } catch (error) {
    console.error(`[MilvusService] Error deleting embeddings by subject ${subjectId}:`, error);
  }
}

export async function resetMilvusIndex() {
  console.log('[MilvusService] Attempting to reset Milvus index...');
  try {
    const collections = await client.showCollections();
    if (!collections.data.some((c) => c.name === COLLECTION_NAME)) {
      console.log(`[MilvusService] Collection ${COLLECTION_NAME} doesn't exist, creating new collection...`);
      await createCollection();
    } else {
      try {
        await client.dropIndex({
          collection_name: COLLECTION_NAME,
        });
        console.log('[MilvusService] Dropped existing index.');
      } catch (error) {
        console.log('[MilvusService] No existing index to drop or error dropping index:', error);
      }
    }

    await createIndex();

    await client.loadCollection({
      collection_name: COLLECTION_NAME,
    });
    console.log('[MilvusService] Milvus index reset successfully.');
    return { success: true, message: 'Milvus index reset successfully' };
  } catch (error) {
    console.error('[MilvusService] Error resetting Milvus index:', error);
    return { success: false, message: (error as Error).message };
  }
}

async function createCollection() {
  console.log(`[MilvusService] Checking/Creating collection: ${COLLECTION_NAME}`);
  try {
    const collections = await client.showCollections();
    if (collections.data.some((c) => c.name === COLLECTION_NAME)) {
      console.log(`[MilvusService] Collection ${COLLECTION_NAME} already exists, skipping creation.`);
      return;
    }

    await client.createCollection({
      collection_name: COLLECTION_NAME,
      fields: [
        {
          name: 'id',
          data_type: DataType.Int64,
          is_primary_key: true,
          autoID: true,
        },
        {
          name: 'text',
          data_type: DataType.VarChar,
          max_length: 4000,
        },
        {
          name: 'embedding',
          data_type: DataType.FloatVector,
          dim: DIMENSION,
        },
        { name: 'user_id', data_type: DataType.VarChar, max_length: 50 },
        { name: 'subject_id', data_type: DataType.VarChar, max_length: 50 },
        { name: 'data_source_id', data_type: DataType.VarChar, max_length: 50 },
        {
          name: 'metadata',
          data_type: DataType.JSON,
          max_length: 2048,
        },
      ],
    });

    console.log(`[MilvusService] Collection '${COLLECTION_NAME}' created successfully.`);
  } catch (error) {
    console.error(`[MilvusService] Error creating collection ${COLLECTION_NAME}:`, error);
    throw error;
  }
}

async function createIndex() {
  console.log(`[MilvusService] Checking/Creating index for collection: ${COLLECTION_NAME}`);
  try {
    const collections = await client.showCollections();
    if (!collections.data.some((c) => c.name === COLLECTION_NAME)) {
      console.log(`[MilvusService] Collection ${COLLECTION_NAME} doesn't exist yet. Cannot create index.`);
      return;
    }

    try {
      const indexInfo = await client.describeIndex({
        collection_name: COLLECTION_NAME,
      });

      const embeddingIndex = indexInfo.index_descriptions.find(
        (index) => index.field_name === 'embedding'
      );

      if (embeddingIndex) {
        console.log(`[MilvusService] Index on 'embedding' field already exists for ${COLLECTION_NAME}, skipping creation.`);
        return;
      }
    } catch (error) {
      console.log('[MilvusService] Index does not exist or error describing index, proceeding with creation...');
    }

    await client.createIndex({
      collection_name: COLLECTION_NAME,
      field_name: 'embedding',
      index_type: 'HNSW',
      metric_type: 'COSINE',
      params: { M: 16, efConstruction: 200 },
    });

    console.log(`[MilvusService] Index created on 'embedding' field for '${COLLECTION_NAME}'.`);
  } catch (error) {
    console.error(`[MilvusService] Error creating index for ${COLLECTION_NAME}:`, error);
    throw error;
  }
}
