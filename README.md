# MindMapGPT

https://github.com/kingsotn/flow2/assets/36507785/8cc85106-967d-429f-8dfa-26c696ae8d9b

Sam Altman said that gpt is best used as a [brainstorming tool](https://youtu.be/jvqFAi7vkBc?si=W-Guv57vhzGdO4yc&t=3140). Let's implement that with an overlay extension on ChatGPT.

This was also something i found cool: https://twitter.com/MindBranches

## Run

```
# contiously compile to .js files
tsc --watch


```

## Timeline:

2 weeks

## Problem:

As someone who uses chatgpt a lot to brainstorm and learn new things, when brainstorming or chatting with chatgpt, it’s hard to find where I want to return to an idea, or where I branched off. CTRL-F doesn’t do it justice because the UI is not great. By creating a tree view I can quickly go and find the information I need and branch off correctly. I also want to save my ideas after each chat session, or have the ability to accumulate how I use chatgpt.

## Goal:

To create a beautiful and easy to understand visual interface of a real-time chatting process to make learning things easier.

## Requirements:

### UI:

1. Node creation after user sends a chat
2. two tabs: one for sent messages and one for LLM’s responses
    - sent contains “EDIT” and “GOTO”, “KEYWORDS”, “SUMM”
    - response contains “GOTO”, “KEYWORDS”, “SUMM”
3. Has to be animated during each node creation
4. Color has to show the current DAG path. Paths that have branched off and are not displaying in the UI must be grayed out

### Tools:

Extension stuff
Javascript — and some other nice graph-building frameworks or sth
node
nextJS
headlessUI
radixUI
tailwind
// Docker? For env stuff
// Python?
