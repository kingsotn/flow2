import React, { useEffect, useState, useRef, createContext, useContext } from 'react';
import { useSession } from './SessionProvider';
import MindMapProvider, { useMindMap, ChatNode, ChatNodePair } from './MindMapProvider';
import { ReactFlowAutoLayout } from './FlowApp';

const isElementNode = (node: Node): node is HTMLElement => node.nodeType === Node.ELEMENT_NODE;

const hasRequiredClasses = (element: Element): boolean =>
    element.classList.contains('w-full') && element.classList.contains('text-token-text-primary');

const getTurnNumber = (element: Element): number | null => {
    const dataTestId = element.getAttribute('data-testid');
    const match = dataTestId?.match(/conversation-turn-(\d+)/);
    return match ? parseInt(match[1], 10) : null;
};

const parseDomToChatNode = (turnNumber: number, messageDiv: Element): ChatNode => {
    // console.log("parsing")
    if (!messageDiv) throw "div is null";

    const uuid = messageDiv.querySelector('[data-message-id]')?.getAttribute('data-message-id');
    const conversationTurnString = messageDiv.closest('[data-testid]')?.getAttribute('data-testid');
    const conversationTurn = conversationTurnString
        ? parseInt(conversationTurnString.match(/\d+$/)?.[0] ?? '0', 10)
        : null;
    let content =
        messageDiv.querySelector(` div > div > div > div.relative.flex.w-full.flex-col > div.flex-col.gap-1.md\\:gap-3 > div.flex.flex-grow.flex-col.max-w-full > div > div`)?.textContent ||
        messageDiv.querySelector('[data-message-author-role="assistant"][data-message-id="17700b54-fa5a-46da-8caf-8dc71f7fe8e3"] .markdown p') ||
        // messageDiv.querySelector(`> div > div > div.relative.flex.w-full.flex-col > div.flex-col.gap-1.md\\:gap-3 > div.flex.flex-grow.flex-col.max-w-full > div > div`) ||
        messageDiv.querySelector('.markdown')?.textContent ||
        '';

    if (uuid === undefined || uuid === null) {
        throw new Error('Error: UUID is null or undefined');
    }

    if (conversationTurnString === null) {
        throw new Error('conversationTurnString is null');
    }

    if (content === null) {
        throw new Error('Content is null');
    }

    console.log(isEven(turnNumber) ? "User" : "Assistant", uuid.slice(-14), conversationTurn, content);
    return {
        uuid: uuid || '',
        conversationTurn: conversationTurn || 0,
        role: isEven(turnNumber) ? "User" : "Assistant",
        content: content as string, // Ensure this is a string or handled accordingly
    };
}

const isEven = (num: number): boolean => num % 2 === 0;

const ConversationObserver: React.FC<{}> = () => {
    const { sessionId } = useSession();
    const observerRef = useRef<MutationObserver | null>(null);
    const { addChatNodePair } = useMindMap();
    const mutationSessionIdRef = useRef(sessionId);
    const lastTurnNumberOnDomRef = useRef<number>(0);

    useEffect(() => {


        function waitForDomLoad(selector: string, interval: number, callback: (element: HTMLElement) => void) {
            let intervalId: NodeJS.Timeout | null = null;

            const checkForElement = () => {
                const element = document.querySelector(selector);
                if (element) {
                    clearInterval(intervalId!); // Stop the interval if element is found
                    callback(element as HTMLElement);
                }
            };

            intervalId = setInterval(checkForElement, interval);
        }

        const setupObserver = () => {
            const chatBlockSelector = '.flex.flex-col.text-sm.pb-9'
            waitForDomLoad(chatBlockSelector, 1000, (chatBody) => {


                // if user switches chats
                if (mutationSessionIdRef.current !== sessionId) {
                    // !! TODO. figure this out.... idk how to init a new reactflow layout.
                    // console.log("sess aint the same!", mutationSessionIdRef.current, sessionId);
                    // ReactFlowAutoLayout();

                    //  when this happens, should first check if the chatContentMap exists for this chat, otherwise parse the entire DOM

                    //  then render to the ui
                    console.log("set new Id");

                    mutationSessionIdRef.current = sessionId;
                }

                // Assuming observerRef is properly initialized and accessible here
                if (observerRef.current) return;

                console.log("Setting up observer on:", chatBody);

                const callback = (mutationsList: MutationRecord[]) => {
                    let chatNodePair: ChatNodePair = {
                        uuid: "",
                        userNode: {} as ChatNode,
                        assistantNode: {} as ChatNode,
                        children: new Map()
                    };

                    const relevantMutations = mutationsList.filter(mutation =>
                        mutation.type === 'childList' &&
                        mutation.addedNodes.length > 0 &&
                        mutation.target instanceof Element &&
                        mutation.target.querySelector('.flex-col.gap-1.md\\:gap-3')
                    );


                    if (relevantMutations.length > 0) {
                        handleMutations(relevantMutations, chatNodePair);
                    }
                };

                observerRef.current = new MutationObserver(callback);
                observerRef.current.observe(chatBody, { childList: true, subtree: true });
            });
        };
        const handleMutations = (mutationsList: MutationRecord[], chatNodePair: ChatNodePair) => {
            console.log("found mutation")

            // Flag to check if chatNodePair is updated to decide on calling addChatNodePair
            let isChatNodePairUpdated = false;

            mutationsList.forEach(mutation => {
                mutation.addedNodes.forEach((textElement) => {
                    if (
                        isElementNode(textElement) &&
                        hasRequiredClasses(textElement as Element) &&
                        (textElement as Element).hasAttribute('data-testid')
                    ) {
                        const turnNumber = getTurnNumber(textElement as Element);
                        if (turnNumber !== null) {
                            // set lastTurnNum
                            lastTurnNumberOnDomRef.current = turnNumber;

                            // Parse the DOM node to create a ChatNode
                            const chatNodeParsed = parseDomToChatNode(turnNumber, textElement);

                            // Update the chatNodePair based on the turn number
                            if (isEven(turnNumber)) {
                                chatNodePair.assistantNode = chatNodeParsed;
                            } else {
                                chatNodePair.userNode = chatNodeParsed;
                                chatNodePair.uuid = chatNodeParsed.uuid; // Assuming UUID is updated for user nodes
                            }

                            isChatNodePairUpdated = true;
                        } else {
                            console.log("TURN NUMBER IS NULL")
                        }
                    }
                });
            });

            // If chatNodePair was updated, add it to the MindMap
            if (isChatNodePairUpdated) {
                addChatNodePair(chatNodePair);
                console.log("chatNodePair added:", chatNodePair);
            }
        };

        setupObserver();
        console.log("sesh", sessionId)

        // Cleanup function
        return () => {
            // clearInterval(intervalId);
            if (observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
            }
        };
    }, [sessionId]); // Dependency on sessionId to reset observer if it changes


    // figure out how many i have                     

    function onEditButtonClick() {
        console.log('Edit button was clicked.');
        // set the current lastNodeOnDom
    }

    let chatNodeMap = new Map<string, ChatNodePair[]>(); // userNode.uuid : ChatNodePair[]



    function parseCurrentChatBody() {

        console.log("sessionId", sessionId)
        // Nothing to parse, empty
        if (sessionId === "newChat") {
            console.log("newChat detected")
            return
        }

        console.log("getChatCount started")
        getChatCount()
        console.log("getChatCount fin")


        for (let turnNum = 2; turnNum <= lastTurnNumberOnDomRef.current; turnNum += 2) {

            const userTurn = turnNum;
            const assistantTurn = turnNum + 1;

            const userTextElement = document.querySelector(`#__next > div.relative.z-0.flex.h-full.w-full.overflow-hidden > div.relative.flex.h-full.max-w-full.flex-1.flex-col.overflow-hidden > main > div.flex.h-full.flex-col > div.flex-1.overflow-hidden > div > div > div > div > div:nth-child(${userTurn})`)
            const assistantTextElement = document.querySelector(`#__next > div.relative.z-0.flex.h-full.w-full.overflow-hidden > div.relative.flex.h-full.max-w-full.flex-1.flex-col.overflow-hidden > main > div.flex.h-full.flex-col > div.flex-1.overflow-hidden > div > div > div > div > div:nth-child(${assistantTurn})`)
            const userGeneralEditButton = document.querySelector(`#__next > div.relative.z-0.flex.h-full.w-full.overflow-hidden > div.relative.flex.h-full.max-w-full.flex-1.flex-col.overflow-hidden > main > div.flex.h-full.flex-col > div.flex-1.overflow-hidden > div > div > div > div > div:nth-child(${userTurn}) > div > div > div.relative.flex.w-full.flex-col > div.flex-col.gap-1.md\\:gap-3 > div.mt-1.flex.justify-start.gap-3.empty\\:hidden > div > button`) as HTMLButtonElement | null;
            const editFractionString = document.querySelector(`#__next > div.relative.z-0.flex.h-full.w-full.overflow-hidden > div.relative.flex.h-full.max-w-full.flex-1.flex-col.overflow-hidden > main > div.flex.h-full.flex-col > div.flex-1.overflow-hidden > div > div > div > div > div:nth-child(${userTurn}) > div > div > div.relative.flex.w-full.flex-col > div.flex-col.gap-1.md\\:gap-3 > div.mt-1.flex.justify-start.gap-3.empty\\:hidden > div.text-xs.flex.items-center.justify-center.gap-1.self-center.visible > span`)?.textContent
            const helpfulDom = document.querySelector("#__next > div.relative.z-0.flex.h-full.w-full.overflow-hidden > div.relative.flex.h-full.max-w-full.flex-1.flex-col.overflow-hidden > main > div.flex.h-full.flex-col > div.flex-1.overflow-hidden > div > div > div > div > div.mx-auto")
            const chatNodePair: ChatNodePair[] = [{ uuid: "temp", children: new Map<string, ChatNodePair> }]
            const previousButton = document.querySelector(`#__next > div.relative.z-0.flex.h-full.w-full.overflow-hidden > div.relative.flex.h-full.max-w-full.flex-1.flex-col.overflow-hidden > main > div.flex.h-full.flex-col > div.flex-1.overflow-hidden > div > div > div > div > div:nth-child(${userTurn}) > div > div > div.relative.flex.w-full.flex-col > div.flex-col.gap-1.md\\:gap-3 > div.mt-1.flex.justify-start.gap-3.empty\\:hidden > div.text-xs.flex.items-center.justify-center.gap-1.self-center.visible > button:nth-child(1)`) as HTMLButtonElement | null;

            // Check if any of the selected DOM elements are empty
            if (!userTextElement) {
                console.log("User text element is empty");
            }
            if (!assistantTextElement) {
                console.log("Assistant text element is empty");
            }
            if (!userGeneralEditButton) {
                console.log("User general edit button is empty");
            }
            if (!editFractionString) {
                console.log("Edit fraction string is empty");
            }
            if (!helpfulDom) {
                console.log("Helpful DOM element is empty");
            }
            if (!previousButton) {
                console.log("Previous button is empty");
            }

            // Initialize chat node pair and edit count tracking.
            // !!When editing a user message, the conversation-turn-## stays the same. If the assistant replies then its conversation-turn-## also stays the same
            // !!An example: if my message is 85, and assistant is at 86. If I edit 85 to another message and submit, then the new div would render but still stay as 85 and assistant will also be 86
            // !!also, the numerator is cached in cookies somewhere when chat switching (i.e 2/3), but on reload it matches denominator (i.e 3/3). Guess i'll just ask users to reload for now... i don't want to think ab this too much
            let editCount = 0, numerator = 0;
            if (editFractionString) {
                [numerator, editCount] = editFractionString.split('/').map(Number);
                const listOfEdits: ChatNodePair[] = []
                for (let i = editCount; i > 0; i--) {
                    if (!userTextElement || !assistantTextElement) {
                        console.log("Edit fraction string: One or both text elements don't exist.");
                        continue;
                    }

                    if (!userTextElement || !assistantTextElement) {
                        console.log("editFractionString: userTextElement doesn't exist")
                        console.log("editFractionString: assistantTextElement doesn't exist")
                    }
                    const parsedChatNodeUser: ChatNode = parseDomToChatNode(userTurn, userTextElement)
                    const parsedChatNodeAssistant: ChatNode = parseDomToChatNode(assistantTurn, assistantTextElement)
                    let editPair = {

                        uuid: parsedChatNodeUser.uuid,
                        userNode: parsedChatNodeUser,
                        assistantNode: parsedChatNodeAssistant,
                        children: new Map(),
                    };
                    listOfEdits.push(editPair)
                    console.log("BLAHHHHH")
                    // todo: click the previous button here:
                    previousButton?.click();
                }
                // append to the map
                const editCountStr = editCount > 0 ? `#${editCount}` : '';
                chatNodeMap.set(`${userTurn}—${assistantTurn}${editCountStr}`, listOfEdits);
            } else {
                // return if it is the "Is this conversation helpful so far?"
                if (helpfulDom === userTextElement) return;

                if (userTextElement) {
                    console.log("Parsing Dom To Chat node in parseCurrentChatBody()")
                    console.log("parseDomToChatNode element", userTextElement)
                    const parsedChatNode: ChatNode = parseDomToChatNode(userTurn, userTextElement)

                    chatNodePair[0].uuid = parsedChatNode.uuid
                    chatNodePair[0].userNode = parsedChatNode
                }

                if (assistantTextElement) {
                    console.log("Parsing Dom To Chat node in parseCurrentChatBody()")
                    console.log("parseDomToChatNode element", assistantTextElement)
                    const parsedChatNode: ChatNode = parseDomToChatNode(assistantTurn, assistantTextElement)
                    chatNodePair[0].assistantNode = parsedChatNode
                }

                if (userGeneralEditButton) {
                    console.log(`button on ${userTurn}`)
                    userGeneralEditButton.addEventListener('click', onEditButtonClick);
                }
                // append to the map
                chatNodeMap.set(`${userTurn}—${assistantTurn}`, chatNodePair);
            }

        }
        // show the chatNodeMap
        console.log("chatNodeMap", chatNodeMap)
        // Iterate over each entry in the map
        // for (let [key, value] of chatNodeMap) {
        //     console.log(key + ":");

        //     // Print the content of each chat node
        //     value.forEach(nodePair => {
        //         console.log("User: ", nodePair.userNode?.content);
        //         console.log("Assistant: ", nodePair.assistantNode?.content);
        //     });
        // }

    }

    function getChatCount() {
        const chatBody = document.querySelector("#__next > div.relative.z-0.flex.h-full.w-full.overflow-hidden > div.relative.flex.h-full.max-w-full.flex-1.flex-col.overflow-hidden > main > div.flex.h-full.flex-col > div.flex-1.overflow-hidden > div > div > div")
        // "if chatBody exists"
        if (!!chatBody) {
            // Assuming each turn is a 'div' directly under 'chatBody'
            const turns = chatBody.querySelectorAll(":scope > div > div");
            console.log(`Total conversation turns: ${turns.length}`);
            lastTurnNumberOnDomRef.current = turns.length
        } else {
            console.log("Chat body not found.");
        }
    }

    parseCurrentChatBody();


    return null; // This component does not render anything
};

export default ConversationObserver;
