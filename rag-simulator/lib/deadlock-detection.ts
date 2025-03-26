// Types for our graph
type NodeType = "process" | "resource"

interface Node {
  id: string
  type: NodeType
  x: number
  y: number
  instances?: number
}

interface Edge {
  id: string
  source: string
  target: string
  type: "request" | "allocation"
}

interface Graph {
  nodes: Node[]
  edges: Edge[]
}

/**
 * Detects deadlocks in a Resource Allocation Graph
 * @param graph The Resource Allocation Graph
 * @returns Object indicating if deadlock exists and the cycle causing it
 */
export function detectDeadlock(graph: Graph): { hasDeadlock: boolean; cycle: string[] } {
  // Build adjacency list for the graph
  const adjacencyList: { [key: string]: string[] } = {}

  // Initialize adjacency list for all nodes
  graph.nodes.forEach((node) => {
    adjacencyList[node.id] = []
  })

  // Add edges to adjacency list
  graph.edges.forEach((edge) => {
    adjacencyList[edge.source].push(edge.target)
  })

  // Function to detect cycles using DFS
  function detectCycle(): { hasCycle: boolean; cycle: string[] } {
    const visited: { [key: string]: boolean } = {}
    const recursionStack: { [key: string]: boolean } = {}
    let cycleFound = false
    let cycleNodes: string[] = []

    function dfs(nodeId: string, path: string[] = []): void {
      if (cycleFound) return

      visited[nodeId] = true
      recursionStack[nodeId] = true

      const currentPath = [...path, nodeId]

      for (const neighbor of adjacencyList[nodeId]) {
        if (!visited[neighbor]) {
          dfs(neighbor, currentPath)
        } else if (recursionStack[neighbor]) {
          // Cycle detected
          cycleFound = true

          // Extract the cycle from the path
          const cycleStartIndex = currentPath.findIndex((node) => node === neighbor)
          cycleNodes = [...currentPath.slice(cycleStartIndex), neighbor]
          return
        }
      }

      recursionStack[nodeId] = false
    }

    // Start DFS from each unvisited node
    for (const node of graph.nodes) {
      if (!visited[node.id] && !cycleFound) {
        dfs(node.id)
      }
    }

    return { hasCycle: cycleFound, cycle: cycleNodes }
  }

  // Detect cycles in the graph
  const { hasCycle, cycle } = detectCycle()

  // If no cycle, no deadlock
  if (!hasCycle) {
    return { hasDeadlock: false, cycle: [] }
  }

  // Check if all resources in the cycle have only one instance
  // For simplicity, we'll consider any cycle as a potential deadlock
  return { hasDeadlock: hasCycle, cycle }
}

