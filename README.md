![STRING DB MCP Server Logo](string-db-mcp-server-logo.png)
# Unofficial STRING MCP Server

A comprehensive Model Context Protocol (MCP) server for accessing the STRING protein interaction database. This server provides powerful tools for protein network analysis, functional enrichment, and comparative genomics through the STRING API.

## Features

### Tools (6 comprehensive tools)

- **get_protein_interactions**: Get direct interaction partners for a specific protein with confidence scores and evidence types
- **get_interaction_network**: Build and analyze protein interaction networks for multiple proteins
- **get_functional_enrichment**: Perform functional enrichment analysis using GO terms, KEGG pathways, and other annotations
- **get_protein_annotations**: Get detailed protein annotations and functional information
- **find_homologs**: Find homologous proteins across different species for comparative analysis
- **search_proteins**: Search for proteins by name or identifier across multiple species

### Resources (6 resource templates)

- **string://network/{protein_ids}**: Protein interaction network data for specified proteins
- **string://enrichment/{protein_ids}**: Functional enrichment analysis results for protein sets
- **string://interactions/{protein_id}**: Direct interaction partners for a specific protein
- **string://homologs/{protein_id}**: Homologous proteins across different species
- **string://annotations/{protein_id}**: Detailed protein annotations and functional information
- **string://species/{taxon_id}**: Species-specific data and protein counts

## Installation

```bash
npm install
npm run build
```

## Usage

### With Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "string-server": {
      "command": "node",
      "args": ["/path/to/string-server/build/index.js"]
    }
  }
}
```

### Example Queries

1. **Find protein interactions**:

   ```
   Get interaction partners for insulin (INS) using get_protein_interactions
   ```

2. **Build protein networks**:

   ```
   Build an interaction network for insulin signaling proteins: INS, INSR, IRS1, AKT1 using get_interaction_network
   ```

3. **Functional enrichment analysis**:

   ```
   Perform functional enrichment analysis on these diabetes-related proteins: INS, INSR, IRS1, GLUT4, AKT1
   ```

4. **Find protein homologs**:

   ```
   Find homologs of human insulin (INS) in mouse and rat using find_homologs
   ```

5. **Search for proteins**:

   ```
   Search for insulin-related proteins using search_proteins with query "insulin"
   ```

6. **Get protein annotations**:

   ```
   Get detailed annotations for insulin receptor pathway proteins using get_protein_annotations
   ```

7. **Access resources directly**:
   ```
   Show me the resource string://network/INS,INSR,IRS1
   ```

## API Integration

This server integrates with the **STRING Database API** (https://string-db.org/):

- **STRING REST API**: For protein interaction data, annotations, and homology information
- **Multi-species support**: Over 5000 organisms supported
- **Evidence types**: Neighborhood, fusion, cooccurrence, coexpression, experimental, database, textmining
- **Confidence scoring**: Interaction confidence scores from 0-1000

## Key Features

### Protein Interaction Analysis

- **Direct interactions**: Find immediate interaction partners
- **Network construction**: Build comprehensive interaction networks
- **Evidence classification**: 7 types of interaction evidence
- **Confidence scoring**: Quantitative interaction confidence

### Functional Analysis

- **GO enrichment**: Gene Ontology term enrichment
- **KEGG pathways**: Metabolic and signaling pathway analysis
- **Custom backgrounds**: Use custom protein sets as background
- **Statistical significance**: P-values and FDR correction

### Comparative Genomics

- **Cross-species analysis**: Find homologs across organisms
- **Evolutionary relationships**: Analyze protein evolution
- **Species filtering**: Focus on specific taxonomic groups
- **Ortholog identification**: Distinguish orthologs from paralogs

### Network Properties

- **Topology analysis**: Network density, clustering, connectivity
- **Hub identification**: Find highly connected proteins
- **Module detection**: Identify protein complexes and modules
- **Path analysis**: Find shortest paths between proteins

## Complementary Servers

This STRING server works excellently with:

- **UniProt MCP Server**: For protein sequences and detailed functional annotations
- **PDB MCP Server**: For protein structures and structural analysis
- **AlphaFold MCP Server**: For predicted protein structures

Together, these provide comprehensive protein analysis: **Sequence → Structure → Interactions → Function**

## Data Quality & Validation

- **Curated data**: STRING combines curated databases with computational predictions
- **Evidence integration**: Multiple evidence types combined using probabilistic framework
- **Regular updates**: Database updated regularly with new experimental data
- **Quality scores**: Each interaction has associated confidence scores

## Error Handling

The server includes robust error handling for:

- Invalid protein identifiers
- Network connectivity issues
- API rate limiting
- Species validation
- Parameter validation
- Malformed requests

## Development

```bash
# Install dependencies
npm install

# Build the server
npm run build

# Run in development mode
npm run dev
```

## Attribution

This project is developed by **Augmented Nature**
🌐 Website: [augmentednature.ai](https://augmentednature.ai)

**About STRING Database**: STRING is a database of known and predicted protein-protein interactions. The interactions include direct (physical) and indirect (functional) associations; they stem from computational prediction, from knowledge transfer between organisms, and from interactions aggregated from other (primary) databases.

## Citation
If you use this project in your research or publications, please cite it as follows:

```bibtex @misc{stringdbmcp2025, 
author = {Moudather Chelbi},
title = {STRING DB MCP Server},
year = {2025},
howpublished = {https://github.com/Augmented-Nature/STRING-db-MCP-Server},
note = {Accessed: 2025-06-29}
