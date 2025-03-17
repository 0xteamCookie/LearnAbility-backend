import { DataType, MilvusClient } from '@zilliz/milvus2-sdk-node';
import { getEmbeddings } from './gemini.service';

const MILVUS_HOST = 'localhost:19530';

const COLLECTION_NAME = 'learnability_sources';
const DIMENSION = 768;
const client = new MilvusClient({ address: MILVUS_HOST });

(async () => {
  try {
    await createCollection();
    await createIndex();
    console.log('Milvus collection and index initialized successfully');
  } catch (error) {
    console.error('Error initializing Milvus:', error);
  }
})();

export async function insertEmbeddings(
  documents: any,
  userId: string,
  metadata: {
    subjectId?: string;
    topicId?: string;
    dataSourceId: string;
  }
) {
  try {
    for (const doc of documents) {
      const embedding = await getEmbeddings(doc.pageContent);
      if (!embedding) continue;

      const enhancedMetadata = {
        ...doc.metadata,
        subjectId: metadata.subjectId || null,
        topicId: metadata.topicId || null,
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
            topic_id: metadata.topicId || '',
            data_source_id: metadata.dataSourceId,
          },
        ],
      });

      console.log('Inserted chunk with subject and topic metadata');
    }
  } catch (error) {
    console.error('Error inserting embeddings:', error);
  }
}

export async function searchMilvus(
  queryText: string,
  userId: string,
  options: {
    topK?: number;
    subjectId?: string;
    topicId?: string;
    dataSourceIds?: string[];
  } = {}
) {
  try {
    const collections = await client.showCollections();
    if (!collections.data.some((c) => c.name === COLLECTION_NAME)) {
      console.log(`Collection ${COLLECTION_NAME} doesn't exist yet`);
      return [];
    }

    try {
      await client.loadCollection({ collection_name: COLLECTION_NAME });
    } catch (error) {
      console.error('Error loading collection:', error);
      return [];
    }

    const { topK = 2, subjectId, topicId, dataSourceIds } = options;

    console.log('Getting query embeddings...');
    const queryEmbedding = await getEmbeddings(queryText);
    if (!queryEmbedding) {
      console.log('Failed to generate embedding');
      return [];
    }

    let filter = `user_id == "${userId}"`;

    if (dataSourceIds && dataSourceIds.length > 0) {
      const dataSourceFilter = dataSourceIds.map((id) => `data_source_id == "${id}"`).join(' || ');
      filter += ` && (${dataSourceFilter})`;
    } else {
      if (subjectId) filter += ` && subject_id == "${subjectId}"`;
      if (topicId) filter += ` && topic_id == "${topicId}"`;
    }

    console.log(`Using filter: ${filter}`);

    try {
      const searchResults = await client.search({
        collection_name: COLLECTION_NAME,
        vector: queryEmbedding,
        limit: topK,
        metric_type: 'COSINE',
        filter: filter,
      });

      if (!searchResults || searchResults.results.length === 0) {
        console.log('No results found with the specified filter');
        if (dataSourceIds && dataSourceIds.length > 0) {
          if (subjectId) {
            console.log('Falling back to subject-based search');
            return await searchMilvus(queryText, userId, { topK, subjectId, topicId });
          }
        }
        return [];
      }

      return searchResults.results.map((result) => ({
        text: result.text,
        score: result.score,
        metadata: result.metadata,
      }));
    } catch (error) {
      if ((error as Error).toString().includes('IndexNotExist')) {
        console.log('Index not found, attempting to create it...');
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
          console.error('Error retrying search after creating index:', retryError);
          return [];
        }
      }
      console.error('Error searching Milvus:', error);
      return [];
    }
  } catch (error) {
    console.error('Error in searchMilvus:', error);
    return [];
  }
}

export async function deleteEmbeddingsByTopic(topicId: string) {
  try {
    await client.loadCollection({ collection_name: COLLECTION_NAME });

    await client.deleteEntities({
      collection_name: COLLECTION_NAME,
      filter: `topic_id == "${topicId}"`,
    });

    console.log(`Deleted embeddings for topic: ${topicId}`);
  } catch (error) {
    console.error('Error deleting embeddings by topic:', error);
  }
}

export async function deleteEmbeddingsByDataSource(dataSourceId: string) {
  try {
    await client.loadCollection({ collection_name: COLLECTION_NAME });

    await client.deleteEntities({
      collection_name: COLLECTION_NAME,
      filter: `data_source_id == "${dataSourceId}"`,
    });

    console.log(`Deleted embeddings for data source: ${dataSourceId}`);
  } catch (error) {
    console.error('Error deleting embeddings:', error);
  }
}

export async function deleteEmbeddingsBySubject(subjectId: string) {
  try {
    await client.loadCollection({ collection_name: COLLECTION_NAME });

    await client.deleteEntities({
      collection_name: COLLECTION_NAME,
      filter: `subject_id == "${subjectId}"`,
    });

    console.log(`Deleted embeddings for subject: ${subjectId}`);
  } catch (error) {
    console.error('Error deleting embeddings by subject:', error);
  }
}

export async function resetMilvusIndex() {
  try {
    console.log('Attempting to reset Milvus index...');

    const collections = await client.showCollections();
    if (!collections.data.some((c) => c.name === COLLECTION_NAME)) {
      console.log(`Collection ${COLLECTION_NAME} doesn't exist, creating new collection...`);
      await createCollection();
    } else {
      try {
        await client.dropIndex({
          collection_name: COLLECTION_NAME,
        });
        console.log('Dropped existing index');
      } catch (error) {
        console.log('No existing index to drop or error dropping index:', error);
      }
    }

    await createIndex();

    await client.loadCollection({
      collection_name: COLLECTION_NAME,
    });

    return { success: true, message: 'Milvus index reset successfully' };
  } catch (error) {
    console.error('Error resetting Milvus index:', error);
    return { success: false, message: (error as Error).message };
  }
}

async function createCollection() {
  try {
    const collections = await client.showCollections();
    if (collections.data.some((c) => c.name === COLLECTION_NAME)) {
      console.log('Collection already exists, skipping...');
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
        { name: 'topic_id', data_type: DataType.VarChar, max_length: 50 },
        { name: 'data_source_id', data_type: DataType.VarChar, max_length: 50 },
        {
          name: 'metadata',
          data_type: DataType.JSON,
          max_length: 2048,
        },
      ],
    });

    console.log(`Collection '${COLLECTION_NAME}' created successfully.`);
  } catch (error) {
    console.error('Error creating collection:', error);
    throw error;
  }
}

async function createIndex() {
  try {
    const collections = await client.showCollections();
    if (!collections.data.some((c) => c.name === COLLECTION_NAME)) {
      console.log(`Collection ${COLLECTION_NAME} doesn't exist yet. Create collection first.`);
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
        console.log('Index already exists, skipping...');
        return;
      }
    } catch (error) {
      console.log('Index may not exist, creating now...');
    }

    await client.createIndex({
      collection_name: COLLECTION_NAME,
      field_name: 'embedding',
      index_type: 'HNSW',
      metric_type: 'COSINE',
      params: { M: 16, efConstruction: 200 },
    });

    console.log(`Index created on '${COLLECTION_NAME}'.`);
  } catch (error) {
    console.error('Error creating index:', error);
    throw error;
  }
}
