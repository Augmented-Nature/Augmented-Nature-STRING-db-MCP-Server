#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';

// STRING API interfaces
interface ProteinInteraction {
  stringId_A: string;
  stringId_B: string;
  preferredName_A: string;
  preferredName_B: string;
  ncbiTaxonId: number;
  score: number;
  nscore: number;
  fscore: number;
  pscore: number;
  ascore: number;
  escore: number;
  dscore: number;
  tscore: number;
}

interface NetworkNode {
  stringId: string;
  preferredName: string;
  protein_size: number;
  annotation: string;
}

interface EnrichmentTerm {
  category: string;
  term: string;
  number_of_genes: number;
  number_of_genes_in_background: number;
  ncbiTaxonId: number;
  inputGenes: string;
  preferredNames: string;
  pvalue: number;
  pvalue_fdr: number;
  description: string;
}

interface HomologyResult {
  stringId: string;
  ncbiTaxonId: number;
  taxonName: string;
  preferredName: string;
  annotation: string;
}

interface ProteinAnnotation {
  stringId: string;
  preferredName: string;
  ncbiTaxonId: number;
  annotation: string;
  protein_size: number;
}

// Type guards and validation functions
const isValidProteinArgs = (
  args: any
): args is { protein_id: string; species?: string; limit?: number; required_score?: number } => {
  return (
    typeof args === 'object' &&
    args !== null &&
    typeof args.protein_id === 'string' &&
    args.protein_id.length > 0 &&
    (args.species === undefined || typeof args.species === 'string') &&
    (args.limit === undefined || (typeof args.limit === 'number' && args.limit > 0 && args.limit <= 2000)) &&
    (args.required_score === undefined || (typeof args.required_score === 'number' && args.required_score >= 0 && args.required_score <= 1000))
  );
};

const isValidNetworkArgs = (
  args: any
): args is { protein_ids: string[]; species?: string; network_type?: string; add_nodes?: number; required_score?: number } => {
  return (
    typeof args === 'object' &&
    args !== null &&
    Array.isArray(args.protein_ids) &&
    args.protein_ids.length > 0 &&
    args.protein_ids.every((id: any) => typeof id === 'string') &&
    (args.species === undefined || typeof args.species === 'string') &&
    (args.network_type === undefined || ['functional', 'physical'].includes(args.network_type)) &&
    (args.add_nodes === undefined || (typeof args.add_nodes === 'number' && args.add_nodes >= 0 && args.add_nodes <= 100)) &&
    (args.required_score === undefined || (typeof args.required_score === 'number' && args.required_score >= 0 && args.required_score <= 1000))
  );
};

const isValidEnrichmentArgs = (
  args: any
): args is { protein_ids: string[]; species?: string; background_string_identifiers?: string[] } => {
  return (
    typeof args === 'object' &&
    args !== null &&
    Array.isArray(args.protein_ids) &&
    args.protein_ids.length > 0 &&
    args.protein_ids.every((id: any) => typeof id === 'string') &&
    (args.species === undefined || typeof args.species === 'string') &&
    (args.background_string_identifiers === undefined ||
     (Array.isArray(args.background_string_identifiers) &&
      args.background_string_identifiers.every((id: any) => typeof id === 'string')))
  );
};

const isValidHomologyArgs = (
  args: any
): args is { protein_id: string; species?: string; target_species?: string[] } => {
  return (
    typeof args === 'object' &&
    args !== null &&
    typeof args.protein_id === 'string' &&
    args.protein_id.length > 0 &&
    (args.species === undefined || typeof args.species === 'string') &&
    (args.target_species === undefined ||
     (Array.isArray(args.target_species) &&
      args.target_species.every((sp: any) => typeof sp === 'string')))
  );
};

const isValidSearchArgs = (
  args: any
): args is { query: string; species?: string; limit?: number } => {
  return (
    typeof args === 'object' &&
    args !== null &&
    typeof args.query === 'string' &&
    args.query.length > 0 &&
    (args.species === undefined || typeof args.species === 'string') &&
    (args.limit === undefined || (typeof args.limit === 'number' && args.limit > 0 && args.limit <= 100))
  );
};

const isValidPathArgs = (
  args: any
): args is { protein_a: string; protein_b: string; species?: string; max_path_length?: number } => {
  return (
    typeof args === 'object' &&
    args !== null &&
    typeof args.protein_a === 'string' &&
    args.protein_a.length > 0 &&
    typeof args.protein_b === 'string' &&
    args.protein_b.length > 0 &&
    (args.species === undefined || typeof args.species === 'string') &&
    (args.max_path_length === undefined || (typeof args.max_path_length === 'number' && args.max_path_length >= 1 && args.max_path_length <= 5))
  );
};

class StringServer {
  private server: Server;
  private apiClient: AxiosInstance;

  constructor() {
    this.server = new Server(
      {
        name: 'string-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Initialize STRING API client
    this.apiClient = axios.create({
      baseURL: 'https://string-db.org/api',
      timeout: 30000,
      headers: {
        'User-Agent': 'STRING-MCP-Server/1.0.0',
        'Accept': 'text/plain',
      },
    });

    this.setupResourceHandlers();
    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error: any) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupResourceHandlers() {
    // List available resource templates
    this.server.setRequestHandler(
      ListResourceTemplatesRequestSchema,
      async () => ({
        resourceTemplates: [
          {
            uriTemplate: 'string://network/{protein_ids}',
            name: 'STRING protein network',
            mimeType: 'application/json',
            description: 'Protein interaction network data for specified proteins',
          },
          {
            uriTemplate: 'string://enrichment/{protein_ids}',
            name: 'STRING functional enrichment',
            mimeType: 'application/json',
            description: 'Functional enrichment analysis results for protein set',
          },
          {
            uriTemplate: 'string://interactions/{protein_id}',
            name: 'STRING protein interactions',
            mimeType: 'application/json',
            description: 'Direct interaction partners for a specific protein',
          },
          {
            uriTemplate: 'string://homologs/{protein_id}',
            name: 'STRING protein homologs',
            mimeType: 'application/json',
            description: 'Homologous proteins across different species',
          },
          {
            uriTemplate: 'string://annotations/{protein_id}',
            name: 'STRING protein annotations',
            mimeType: 'application/json',
            description: 'Detailed protein annotations and functional information',
          },
          {
            uriTemplate: 'string://species/{taxon_id}',
            name: 'STRING species information',
            mimeType: 'application/json',
            description: 'Species-specific data and protein counts',
          },
        ],
      })
    );

    // Handle resource requests
    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request: any) => {
        const uri = request.params.uri;

        // Handle network requests
        const networkMatch = uri.match(/^string:\/\/network\/(.+)$/);
        if (networkMatch) {
          const proteinIds = networkMatch[1].split(',');
          try {
            const result = await this.handleGetInteractionNetwork({ protein_ids: proteinIds });

            return {
              contents: [
                {
                  uri: request.params.uri,
                  mimeType: 'application/json',
                  text: result.content[0].text,
                },
              ],
            };
          } catch (error) {
            throw new McpError(
              ErrorCode.InternalError,
              `Failed to fetch protein network: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        }

        // Handle interaction requests
        const interactionMatch = uri.match(/^string:\/\/interactions\/(.+)$/);
        if (interactionMatch) {
          const proteinId = interactionMatch[1];
          try {
            const result = await this.handleGetProteinInteractions({ protein_id: proteinId });

            return {
              contents: [
                {
                  uri: request.params.uri,
                  mimeType: 'application/json',
                  text: result.content[0].text,
                },
              ],
            };
          } catch (error) {
            throw new McpError(
              ErrorCode.InternalError,
              `Failed to fetch protein interactions: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        }

        throw new McpError(
          ErrorCode.InvalidRequest,
          `Invalid URI format: ${uri}`
        );
      }
    );
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_protein_interactions',
          description: 'Get direct interaction partners for a specific protein',
          inputSchema: {
            type: 'object',
            properties: {
              protein_id: { type: 'string', description: 'Protein identifier (gene name, UniProt ID, or STRING ID)' },
              species: { type: 'string', description: 'Species name or NCBI taxonomy ID (default: 9606 for human)' },
              limit: { type: 'number', description: 'Maximum number of interactions to return (default: 10)', minimum: 1, maximum: 2000 },
              required_score: { type: 'number', description: 'Minimum interaction confidence score (0-1000, default: 400)', minimum: 0, maximum: 1000 },
            },
            required: ['protein_id'],
          },
        },
        {
          name: 'get_interaction_network',
          description: 'Build and analyze protein interaction network for multiple proteins',
          inputSchema: {
            type: 'object',
            properties: {
              protein_ids: { type: 'array', items: { type: 'string' }, description: 'List of protein identifiers' },
              species: { type: 'string', description: 'Species name or NCBI taxonomy ID (default: 9606 for human)' },
              network_type: { type: 'string', enum: ['functional', 'physical'], description: 'Type of network to build (default: functional)' },
              add_nodes: { type: 'number', description: 'Number of additional interacting proteins to add (default: 0)', minimum: 0, maximum: 100 },
              required_score: { type: 'number', description: 'Minimum interaction confidence score (0-1000, default: 400)', minimum: 0, maximum: 1000 },
            },
            required: ['protein_ids'],
          },
        },
        {
          name: 'get_functional_enrichment',
          description: 'Perform functional enrichment analysis on a set of proteins',
          inputSchema: {
            type: 'object',
            properties: {
              protein_ids: { type: 'array', items: { type: 'string' }, description: 'List of protein identifiers' },
              species: { type: 'string', description: 'Species name or NCBI taxonomy ID (default: 9606 for human)' },
              background_string_identifiers: { type: 'array', items: { type: 'string' }, description: 'Background protein set for enrichment (optional)' },
            },
            required: ['protein_ids'],
          },
        },
        {
          name: 'get_protein_annotations',
          description: 'Get detailed annotations and functional information for proteins',
          inputSchema: {
            type: 'object',
            properties: {
              protein_ids: { type: 'array', items: { type: 'string' }, description: 'List of protein identifiers' },
              species: { type: 'string', description: 'Species name or NCBI taxonomy ID (default: 9606 for human)' },
            },
            required: ['protein_ids'],
          },
        },
        {
          name: 'find_homologs',
          description: 'Find homologous proteins across different species',
          inputSchema: {
            type: 'object',
            properties: {
              protein_id: { type: 'string', description: 'Protein identifier (gene name, UniProt ID, or STRING ID)' },
              species: { type: 'string', description: 'Source species name or NCBI taxonomy ID (default: 9606 for human)' },
              target_species: { type: 'array', items: { type: 'string' }, description: 'Target species to search for homologs (optional)' },
            },
            required: ['protein_id'],
          },
        },
        {
          name: 'search_proteins',
          description: 'Search for proteins by name or identifier across species',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query (protein name, gene name, or identifier)' },
              species: { type: 'string', description: 'Species name or NCBI taxonomy ID (optional)' },
              limit: { type: 'number', description: 'Maximum number of results (default: 10)', minimum: 1, maximum: 100 },
            },
            required: ['query'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'get_protein_interactions':
          return this.handleGetProteinInteractions(args);
        case 'get_interaction_network':
          return this.handleGetInteractionNetwork(args);
        case 'get_functional_enrichment':
          return this.handleGetFunctionalEnrichment(args);
        case 'get_protein_annotations':
          return this.handleGetProteinAnnotations(args);
        case 'find_homologs':
          return this.handleFindHomologs(args);
        case 'search_proteins':
          return this.handleSearchProteins(args);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}`
          );
      }
    });
  }

  // Utility methods
  private parseTsvData<T>(tsvData: string): T[] {
    const lines = tsvData.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split('\t');
    const results: T[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split('\t');
      const obj: any = {};

      headers.forEach((header, index) => {
        const value = values[index] || '';
        // Convert numeric fields
        if (['score', 'nscore', 'fscore', 'pscore', 'ascore', 'escore', 'dscore', 'tscore',
             'ncbiTaxonId', 'protein_size', 'number_of_genes', 'number_of_genes_in_background',
             'pvalue', 'pvalue_fdr'].includes(header)) {
          obj[header] = parseFloat(value) || 0;
        } else {
          obj[header] = value;
        }
      });

      results.push(obj as T);
    }

    return results;
  }

  private getEvidenceTypes(interaction: ProteinInteraction): string[] {
    const types: string[] = [];
    if (interaction.nscore > 0) types.push('neighborhood');
    if (interaction.fscore > 0) types.push('fusion');
    if (interaction.pscore > 0) types.push('cooccurrence');
    if (interaction.ascore > 0) types.push('coexpression');
    if (interaction.escore > 0) types.push('experimental');
    if (interaction.dscore > 0) types.push('database');
    if (interaction.tscore > 0) types.push('textmining');
    return types;
  }

  // Tool handlers
  private async handleGetProteinInteractions(args: any) {
    if (!isValidProteinArgs(args)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid protein interaction arguments');
    }

    try {
      const species = args.species || '9606';
      const limit = args.limit || 10;
      const requiredScore = args.required_score || 400;

      const response = await this.apiClient.get('/tsv/interaction_partners', {
        params: {
          identifiers: args.protein_id,
          species: species,
          limit: limit,
          required_score: requiredScore,
        },
      });

      const interactions = this.parseTsvData<ProteinInteraction>(response.data);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              query_protein: args.protein_id,
              species: species,
              total_interactions: interactions.length,
              interactions: interactions.map(int => ({
                partner_protein: int.preferredName_B,
                string_id: int.stringId_B,
                confidence_score: int.score,
                evidence_scores: {
                  neighborhood: int.nscore,
                  fusion: int.fscore,
                  cooccurrence: int.pscore,
                  coexpression: int.ascore,
                  experimental: int.escore,
                  database: int.dscore,
                  textmining: int.tscore,
                }
              }))
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching protein interactions: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetInteractionNetwork(args: any) {
    if (!isValidNetworkArgs(args)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid network arguments');
    }

    try {
      const species = args.species || '9606';
      const addNodes = args.add_nodes || 0;
      const requiredScore = args.required_score || 400;

      // Get network data
      const networkResponse = await this.apiClient.get('/tsv/network', {
        params: {
          identifiers: args.protein_ids.join('%0d'),
          species: species,
          add_white_nodes: addNodes,
          required_score: requiredScore,
        },
      });

      const interactions = this.parseTsvData<ProteinInteraction>(networkResponse.data);

      // Get node annotations
      const nodeResponse = await this.apiClient.get('/tsv/get_string_ids', {
        params: {
          identifiers: args.protein_ids.join('%0d'),
          species: species,
        },
      });

      const nodes = this.parseTsvData<NetworkNode>(nodeResponse.data);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              query_proteins: args.protein_ids,
              species: species,
              network_stats: {
                total_nodes: nodes.length,
                total_edges: interactions.length,
                average_degree: interactions.length > 0 ? (interactions.length * 2) / nodes.length : 0,
              },
              nodes: nodes.map(node => ({
                protein_name: node.preferredName,
                string_id: node.stringId,
                annotation: node.annotation,
                protein_size: node.protein_size,
              })),
              edges: interactions.map(int => ({
                protein_a: int.preferredName_A,
                protein_b: int.preferredName_B,
                confidence_score: int.score,
                evidence_types: this.getEvidenceTypes(int),
              }))
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error building interaction network: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetFunctionalEnrichment(args: any) {
    if (!isValidEnrichmentArgs(args)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid enrichment arguments');
    }

    try {
      const species = args.species || '9606';

      const params: any = {
        identifiers: args.protein_ids.join('%0d'),
        species: species,
        caller_identity: 'string-mcp-server',
      };

      if (args.background_string_identifiers) {
        params.background_string_identifiers = args.background_string_identifiers.join('%0d');
      }

      const response = await this.apiClient.get('/tsv/enrichment', { params });

      const enrichments = this.parseTsvData<EnrichmentTerm>(response.data);

      // Group by category
      const groupedEnrichments: Record<string, EnrichmentTerm[]> = {};
      enrichments.forEach(term => {
        if (!groupedEnrichments[term.category]) {
          groupedEnrichments[term.category] = [];
        }
        groupedEnrichments[term.category].push(term);
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              query_proteins: args.protein_ids,
              species: species,
              total_terms: enrichments.length,
              enrichment_categories: Object.keys(groupedEnrichments),
              enrichments: groupedEnrichments,
              significant_terms: enrichments.filter(term => term.pvalue_fdr < 0.05).length,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error performing functional enrichment: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetProteinAnnotations(args: any) {
    if (!isValidNetworkArgs(args)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid protein annotation arguments');
    }

    try {
      const species = args.species || '9606';

      const response = await this.apiClient.get('/tsv/get_string_ids', {
        params: {
          identifiers: args.protein_ids.join('%0d'),
          species: species,
        },
      });

      const annotations = this.parseTsvData<ProteinAnnotation>(response.data);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              species: species,
              proteins: annotations.map(protein => ({
                query_id: protein.preferredName,
                string_id: protein.stringId,
                preferred_name: protein.preferredName,
                ncbi_taxon_id: protein.ncbiTaxonId,
                annotation: protein.annotation,
                protein_size: protein.protein_size,
              }))
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching protein annotations: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleFindHomologs(args: any) {
    if (!isValidHomologyArgs(args)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid homology arguments');
    }

    try {
      const species = args.species || '9606';

      const params: any = {
        identifiers: args.protein_id,
        species: species,
      };

      if (args.target_species) {
        params.target_species = args.target_species.join(',');
      }

      const response = await this.apiClient.get('/tsv/homology', { params });

      const homologs = this.parseTsvData<HomologyResult>(response.data);

      // Group by species
      const groupedHomologs: Record<string, HomologyResult[]> = {};
      homologs.forEach(homolog => {
        const speciesKey = `${homolog.ncbiTaxonId}_${homolog.taxonName}`;
        if (!groupedHomologs[speciesKey]) {
          groupedHomologs[speciesKey] = [];
        }
        groupedHomologs[speciesKey].push(homolog);
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              query_protein: args.protein_id,
              source_species: species,
              total_homologs: homologs.length,
              species_count: Object.keys(groupedHomologs).length,
              homologs_by_species: groupedHomologs,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error finding homologs: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleSearchProteins(args: any) {
    if (!isValidSearchArgs(args)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid search arguments');
    }

    try {
      const species = args.species || '';
      const limit = args.limit || 10;

      const params: any = {
        identifiers: args.query,
        limit: limit,
      };

      if (species) {
        params.species = species;
      }

      const response = await this.apiClient.get('/tsv/get_string_ids', { params });

      const results = this.parseTsvData<ProteinAnnotation>(response.data);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              query: args.query,
              species_filter: species || 'all',
              total_results: results.length,
              proteins: results.map(protein => ({
                string_id: protein.stringId,
                preferred_name: protein.preferredName,
                ncbi_taxon_id: protein.ncbiTaxonId,
                annotation: protein.annotation,
                protein_size: protein.protein_size,
              }))
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error searching proteins: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('STRING MCP server running on stdio');
  }
}

const server = new StringServer();
server.run().catch(console.error);
