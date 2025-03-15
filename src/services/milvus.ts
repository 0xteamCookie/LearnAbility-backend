import { DataType, MilvusClient } from '@zilliz/milvus2-sdk-node';
import { getEmbeddings } from './gemini.service';

const MILVUS_HOST = 'localhost:19530';
const COLLECTION_NAME = 'learnability_source';
const DIMENSION = 768;
const client = new MilvusClient({ address: MILVUS_HOST });

createCollection();
createIndex();

export async function insertEmbeddings(documents: any, userId: string) {
  try {
    for (const doc of documents) {
      const embedding = await getEmbeddings(doc.pageContent);
      if (!embedding) continue;

      await client.insert({
        collection_name: COLLECTION_NAME,
        data: [
          {
            text: doc.pageContent,
            embedding,
            metadata: doc.metadata,
            user_id: userId,
          },
        ],
      });

      console.log(`Inserted chunk`);
    }
  } catch (error) {
    console.error('Error inserting embeddings:', error);
  }
}

export async function searchMilvus(queryText: string, userId: string, topK = 2) {
  try {
    await client.loadCollection({ collection_name: COLLECTION_NAME });

    console.log('Getting query embeddings...');
    const queryEmbedding = await getEmbeddings(queryText);
    if (!queryEmbedding) {
      throw new Error('Failed to generate embedding');
    }

    const searchResults = await client.search({
      collection_name: COLLECTION_NAME,
      vector: queryEmbedding,
      limit: topK,
      metric_type: 'COSINE',
      filter: `user_id == "${userId}"`,
    });

    console.log(searchResults);
    if (!searchResults || searchResults.results.length === 0) {
      throw new Error('No relevant results found.');
    }

    return searchResults.results.map((result) => ({
      text: result.text,
      score: result.score,
      metadata: result.metadata,
    }));
  } catch (error) {
    console.error('Error searching Milvus:', error);
    throw new Error(`Search failed: ${error}`);
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
  }
}

async function createIndex() {
  try {
    const indexInfo = await client.describeIndex({
      collection_name: COLLECTION_NAME,
    });

    // check if index already exists
    const embeddingIndex = indexInfo.index_descriptions.find(
      (index) => index.field_name === 'embedding'
    );

    if (embeddingIndex) {
      console.log('Index already exists, skipping...');
      return;
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
  }
}
