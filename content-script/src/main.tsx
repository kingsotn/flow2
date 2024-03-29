import React from "react";
import { createRoot } from "react-dom/client";
import "./main.css";
import App from "./App";
import ConversationObserver from "./ConversationObserver";
import { SessionProvider } from "./SessionProvider";
import MindMapProvider from "./MindMapProvider";

import './index.css'
const appRootId = "react-app-root";
let appRootElem = document.getElementById(appRootId);
if (!appRootElem) {
    appRootElem = document.createElement("div");
    appRootElem.id = appRootId;
    document.body.appendChild(appRootElem);
    console.log("creating")
}



if (appRootElem) {
    const root = createRoot(appRootElem);
    root.render(
        <React.StrictMode>
            <SessionProvider>
                <MindMapProvider>
                    <ConversationObserver />
                    {/* <App /> */}
                </MindMapProvider>
            </SessionProvider>
        </React.StrictMode>,
    );
} else {
    console.error("Failed to find or create root element for React app");
}