import React, { createContext, useContext, useCallback, ReactNode, useEffect } from 'react';
import ReactFlow, {
    addEdge, Node, Edge, Connection, OnNodesChange, OnEdgesChange, useNodesState, useEdgesState, ReactFlowProvider, MarkerType,
    useReactFlow,
    NodeMouseHandler,
    OnConnect,
    ConnectionLineType,
    FitView
} from 'reactflow';
// import { FlowProvider } from "./FlowProvider"
import useAutoLayout, { type LayoutOptions } from './useAutoLayout';
// import { useFlow } from './FlowProvider';
import { initialNodes, initialEdges, ChatNodePairUi } from './initialData';
import { useMindMap, ChatNodePair } from './MindMapProvider';
import { useControls, button } from 'leva';

import 'reactflow/dist/style.css'

const proOptions = {
    account: 'paid-pro',
    hideAttribution: true,
};

const defaultEdgeOptions = {
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed },
    pathOptions: { offset: 5 },
};

// const nodeTypes: NodeTypes = {
//     shape: ShapeNode,
// };

export function ReactFlowAutoLayout() {
    console.log("calling ReactFlowAutoLayout")

    const { fitView, addNodes } = useReactFlow();
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes); // nodes refers to nodes on the ui
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // this hook handles the computation of the layout once the elements or the direction changes

    const layoutOptions = useControls({
        about: {
            value:
                'Add child nodes by clicking a node in the graph. Add new root nodes by clicking the button below.',
            editable: false,
        },
        algorithm: {
            value: 'elk' as LayoutOptions['algorithm'],
            options: ['dagre', 'd3-hierarchy', 'elk'] as LayoutOptions['algorithm'][],
        },
        direction: {
            value: 'TB' as LayoutOptions['direction'],
            options: {
                down: 'TB',
                right: 'LR',
                up: 'BT',
                left: 'RL',
            } as Record<string, LayoutOptions['direction']>,
        },
        spacing: [80, 10],
        // 'add root node': button(() =>
        //     addNodes({
        //         id: "1",
        //         position: { x: 0, y: 0 },
        //         data: { label: `New Node` },
        //         style: { opacity: 0 },
        //     })
        // ),
    });

    useAutoLayout(layoutOptions)

    // every time our nodes change, we want to center the graph again
    useEffect(() => {
        // console.log("fitview useEffect")
        fitView();
    }, [nodes, fitView]);

    const mindMapInfo = useMindMap();

    const onConnect: OnConnect = useCallback(
        (connection) => setEdges((eds) => addEdge(connection, eds)),
        [setEdges]
    );

    const addChildNode = useCallback((node: ChatNodePair) => {
        console.log(">>> Inside addChildNode with", node);

        if (!node || !node.parent) {
            console.log("Node data is incomplete or missing");
            return; // Early return if node data doesn't meet the requirements
        }

        const childNode: ChatNodePairUi = {
            id: node.uuid,
            data: { ...node, label: String(node.userTurn) },
            position: { x: 0, y: 0 },
            style: { opacity: 0 },
        };

        // console.log(`connecting!!!!!!!!!!!!1 ${node.parent.uuid} to ${node.uuid}`)
        console.log(`connecting!!!!!!!!!!!! ${node.parent.userTurn} to ${node.userTurn}`)
        const connectingEdge: Edge = {
            id: `${node.parent.uuid}->${node.uuid}`,
            source: node.parent.uuid, // Assuming node.parent is a string. If node.parent is an object, adjust accordingly.
            target: node.uuid,
            style: { opacity: 0 },
            animated: true
        };

        console.log("connectingEdge", connectingEdge)

        // console.log(`parent: ${node.parent.uuid}`, `child: ${node.uuid}`)
        // console.log(`parent: ${node.parent.userTurn}`, `child: ${node.userTurn}`)

        addNodes({
            id: node.uuid,
            position: { x: 0, y: 0 },
            data: { ...node, label: node.uuid.slice(-5), parent: mindMapInfo.lastNodeOnDom },
            // style: { opacity: 0 },
        })

        mindMapInfo.updateLastNodeOnDomRef(node);

        setNodes((currentNodes) => currentNodes.concat([childNode]));
        setEdges((currentEdges) => currentEdges.concat([connectingEdge]));
    }, [setNodes, setEdges]);

    const branchChildNode = useCallback((node: ChatNodePair) => {
        console.log(">>> Inside branchChildNode with", node);

        // Validation checks
        if (!node || !node.parent) {
            console.log("Node data is incomplete or missing");
            return; // Early return if node data doesn't meet the requirements
        }

        // Create the new node for the UI
        const branchNode: ChatNodePairUi = {
            id: node.uuid,
            data: { ...node, label: String(node.userTurn) },
            position: { x: Math.random() * 100, y: Math.random() * 100 }, // Example positioning, adjust as needed
            style: { opacity: 1 }, // Adjust for branching node if needed
        };

        // Create the connecting edge for the UI
        console.log(`Branching from ${node.parent.userTurn} to ${node.userTurn}`)
        const branchingEdge: Edge = {
            id: `${node.parent.uuid}->${node.uuid}`,
            source: node.parent.uuid,
            target: node.uuid,
            style: { opacity: 1, stroke: "#ff0000" }, // Example style, adjust as needed
            animated: true,
        };

        // Add the new node and edge to your state, similar to addChildNode but with your branching logic
        setNodes((currentNodes) => [...currentNodes, branchNode]);
        setEdges((currentEdges) => [...currentEdges, branchingEdge]);

        // Update any other state or references as needed for the branching logic
    }, [setNodes, setEdges]); // Include other dependencies as necessary



    // normally adding a node
    useEffect(() => {
        console.log("all nodes:")
        nodes.forEach((nd) => {
            console.log(nd.data.label)
        })
        console.log("all edges", edges)

        console.log("testing useEffect mindmapinfo")
        if (mindMapInfo.toAddNode) {
            console.log("mindMapInfo.lastNodeOnDom", mindMapInfo.lastNodeOnDom)
            const newCNP: ChatNodePair = {
                uuid: mindMapInfo.toAddNode.uuid,
                children: new Map<string, ChatNodePair>(), // the newest leaf node has to have no children
                parent: mindMapInfo.lastNodeOnDom,
                userTurn: mindMapInfo.toAddNode.userTurn,
                assistantTurn: mindMapInfo.toAddNode.assistantTurn,
            };

            addChildNode(newCNP)
        }
    }, [mindMapInfo.mindMap.size, mindMapInfo.toAddNode])

    useEffect(() => {
        console.log("BRANCH TIMEEEEE", mindMapInfo.toBranchNode)

        if (mindMapInfo.toBranchNode) {
            console.log("mindMapInfo.lastNodeOnDom", mindMapInfo.lastNodeOnDom)
            const newCNP: ChatNodePair = {
                uuid: mindMapInfo.toBranchNode.uuid,
                children: new Map<string, ChatNodePair>(), // the newest leaf node has to have no children
                parent: mindMapInfo.toBranchNode.parent,
                userTurn: mindMapInfo.toBranchNode.userTurn,
                assistantTurn: mindMapInfo.toBranchNode.assistantTurn,
            };

            branchChildNode(newCNP)
        }

    }, [mindMapInfo.toBranchNode])

    // 


    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodesDraggable={true}
            defaultEdgeOptions={defaultEdgeOptions}
            connectionLineType={ConnectionLineType.Bezier}
            proOptions={proOptions}
            zoomOnDoubleClick={false}
        />
    );
}

const ReactFlowWrapper = () => {
    return (
        <ReactFlowProvider>
            <ReactFlowAutoLayout />
        </ReactFlowProvider>
    );
};

export default ReactFlowWrapper;
