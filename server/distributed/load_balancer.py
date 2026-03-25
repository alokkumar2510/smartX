#!/usr/bin/env python3
"""
server/distributed/load_balancer.py — SmartChat X Distributed Server Simulation
══════════════════════════════════════════════════════════════════════════════
Simulates a cluster of chat server nodes with:
  • Round-robin and least-connections load balancing
  • Health monitoring
  • Automatic failover
  • Node status visualization
"""

import time
import random
import logging
from threading import Lock
from enum import Enum

logger = logging.getLogger("SmartChatX.Distributed")


class NodeStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    DOWN = "down"
    STARTING = "starting"


class ServerNode:
    """Simulated server node in the cluster."""

    def __init__(self, node_id: str, name: str, capacity: int = 100):
        self.node_id = node_id
        self.name = name
        self.capacity = capacity
        self.current_connections = 0
        self.total_served = 0
        self.status = NodeStatus.HEALTHY
        self.uptime_start = time.time()
        self.cpu_usage = 0.0
        self.memory_usage = 0.0
        self.response_time_ms = 5.0
        self.error_rate = 0.0
        self.last_health_check = time.time()
        self.health_history = []

    def simulate_load(self):
        """Simulate realistic server metrics."""
        load_factor = self.current_connections / max(self.capacity, 1)
        
        # CPU and memory increase with connections
        self.cpu_usage = min(95, load_factor * 60 + random.uniform(5, 15))
        self.memory_usage = min(90, 30 + load_factor * 40 + random.uniform(0, 10))
        self.response_time_ms = 5 + load_factor * 50 + random.uniform(0, 10)
        self.error_rate = min(0.5, load_factor * 0.1 + random.uniform(0, 0.02))

        # Determine status based on metrics
        if self.cpu_usage > 90 or self.error_rate > 0.3:
            self.status = NodeStatus.DOWN
        elif self.cpu_usage > 70 or self.memory_usage > 80:
            self.status = NodeStatus.DEGRADED
        else:
            self.status = NodeStatus.HEALTHY

        self.health_history.append({
            "time": time.time(),
            "cpu": round(self.cpu_usage, 1),
            "memory": round(self.memory_usage, 1),
            "connections": self.current_connections,
            "response_ms": round(self.response_time_ms, 1),
            "status": self.status.value
        })
        if len(self.health_history) > 100:
            self.health_history = self.health_history[-100:]

    def add_connection(self):
        self.current_connections += 1
        self.total_served += 1
        self.simulate_load()

    def remove_connection(self):
        self.current_connections = max(0, self.current_connections - 1)
        self.simulate_load()

    def to_dict(self):
        return {
            "node_id": self.node_id,
            "name": self.name,
            "status": self.status.value,
            "capacity": self.capacity,
            "current_connections": self.current_connections,
            "total_served": self.total_served,
            "cpu_usage": round(self.cpu_usage, 1),
            "memory_usage": round(self.memory_usage, 1),
            "response_time_ms": round(self.response_time_ms, 1),
            "error_rate": round(self.error_rate, 4),
            "uptime_seconds": round(time.time() - self.uptime_start),
            "load_percentage": round(
                self.current_connections / max(self.capacity, 1) * 100, 1
            )
        }


class LoadBalancer:
    """
    Distributes connections across server nodes.
    
    Algorithms:
    ┌─────────────────────┬──────────────────────────────────────┐
    │ Round Robin          │ Cycle through nodes sequentially    │
    │ Least Connections    │ Route to node with fewest active    │
    │ Weighted             │ Prefer higher-capacity nodes        │
    │ Random               │ Random healthy node selection       │
    └─────────────────────┴──────────────────────────────────────┘
    
    Failover:
    ┌─────────────────────────────────────────────────────┐
    │  Request → Primary Node                             │
    │     ↓ (if DOWN)                                     │
    │  Failover → Next healthy node                       │
    │     ↓ (if all DOWN)                                 │
    │  Circuit Breaker → Queue request for retry          │
    └─────────────────────────────────────────────────────┘
    """

    def __init__(self):
        self.nodes = {}
        self.lock = Lock()
        self.algorithm = "least_connections"
        self.rr_index = 0
        self.failover_count = 0
        self.total_routed = 0
        self.routing_log = []

        # Initialize simulated nodes
        self._init_default_nodes()
        logger.info("🌍 Load Balancer initialized with cluster simulation")

    def _init_default_nodes(self):
        """Create default server cluster."""
        nodes_config = [
            ("node-alpha", "Alpha Server (Primary)", 100),
            ("node-beta", "Beta Server (Secondary)", 80),
            ("node-gamma", "Gamma Server (Backup)", 60),
        ]
        for node_id, name, capacity in nodes_config:
            self.nodes[node_id] = ServerNode(node_id, name, capacity)
            logger.info(f"🌍 Node registered: {name} (capacity: {capacity})")

    def route_connection(self, username: str) -> dict:
        """
        Route a new connection to the best available node.
        """
        with self.lock:
            self.total_routed += 1
            
            healthy_nodes = [
                n for n in self.nodes.values()
                if n.status != NodeStatus.DOWN
            ]

            if not healthy_nodes:
                self.failover_count += 1
                logger.error("🌍 ALL NODES DOWN — circuit breaker activated!")
                return {
                    "assigned": False,
                    "reason": "all_nodes_down",
                    "failover": True
                }

            # Select node based on algorithm
            if self.algorithm == "round_robin":
                node = healthy_nodes[self.rr_index % len(healthy_nodes)]
                self.rr_index += 1
            elif self.algorithm == "least_connections":
                node = min(healthy_nodes, key=lambda n: n.current_connections)
            elif self.algorithm == "weighted":
                node = max(healthy_nodes, 
                          key=lambda n: n.capacity - n.current_connections)
            else:  # random
                node = random.choice(healthy_nodes)

            node.add_connection()

            route_info = {
                "assigned": True,
                "node_id": node.node_id,
                "node_name": node.name,
                "algorithm": self.algorithm,
                "connections_on_node": node.current_connections,
                "node_status": node.status.value,
                "username": username
            }

            self.routing_log.append({**route_info, "time": time.time()})
            if len(self.routing_log) > 100:
                self.routing_log = self.routing_log[-100:]

            logger.info(f"🌍 ROUTE | {username} → {node.name} | "
                         f"Algorithm: {self.algorithm} | "
                         f"Connections: {node.current_connections}/{node.capacity}")

            return route_info

    def release_connection(self, node_id: str):
        """Release a connection from a node."""
        if node_id in self.nodes:
            self.nodes[node_id].remove_connection()

    def set_algorithm(self, algo: str):
        """Change load balancing algorithm."""
        valid = ["round_robin", "least_connections", "weighted", "random"]
        if algo in valid:
            self.algorithm = algo
            logger.info(f"🌍 Load balancing algorithm → {algo}")

    def simulate_node_failure(self, node_id: str):
        """Simulate a node going down."""
        if node_id in self.nodes:
            self.nodes[node_id].status = NodeStatus.DOWN
            self.nodes[node_id].cpu_usage = 0
            logger.warning(f"🌍 NODE FAILURE | {self.nodes[node_id].name} → DOWN")

    def recover_node(self, node_id: str):
        """Simulate a node recovering."""
        if node_id in self.nodes:
            self.nodes[node_id].status = NodeStatus.STARTING
            self.nodes[node_id].simulate_load()
            self.nodes[node_id].status = NodeStatus.HEALTHY
            logger.info(f"🌍 NODE RECOVERED | {self.nodes[node_id].name} → HEALTHY")

    def health_check(self):
        """Run health check on all nodes."""
        for node in self.nodes.values():
            node.last_health_check = time.time()
            node.simulate_load()

    def get_cluster_status(self) -> dict:
        """Return full cluster status for dashboard."""
        total_capacity = sum(n.capacity for n in self.nodes.values())
        total_connections = sum(n.current_connections for n in self.nodes.values())
        healthy = sum(1 for n in self.nodes.values() if n.status == NodeStatus.HEALTHY)

        return {
            "algorithm": self.algorithm,
            "total_nodes": len(self.nodes),
            "healthy_nodes": healthy,
            "total_capacity": total_capacity,
            "total_connections": total_connections,
            "utilization": round(total_connections / max(total_capacity, 1) * 100, 1),
            "total_routed": self.total_routed,
            "failover_count": self.failover_count,
            "nodes": {nid: n.to_dict() for nid, n in self.nodes.items()},
            "recent_routing": self.routing_log[-5:]
        }


# Singleton
load_balancer = LoadBalancer()
