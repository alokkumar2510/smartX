# 🏗️ Architecture Documentation — SmartChat X

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND LAYER                         │
│  React 18 + Vite + Tailwind CSS + Framer Motion + Chart.js  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │   Chat   │ │Dashboard │ │ Network  │ │ Settings │       │
│  │  Page    │ │  Page    │ │  Page    │ │  Page    │       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│       │             │            │             │             │
│  ┌────┴─────────────┴────────────┴─────────────┴────┐       │
│  │            Context Providers + Hooks              │       │
│  │  (Socket, Chat, User, Theme, Protocol)            │       │
│  └────────────────────┬──────────────────────────────┘       │
│                       │                                      │
│  ┌────────────────────┴──────────────────────────────┐       │
│  │              Services Layer (API + WS)             │       │
│  └────────────────────┬──────────────────────────────┘       │
└───────────────────────┼─────────────────────────────────────┘
                        │ REST API + WebSocket
┌───────────────────────┼─────────────────────────────────────┐
│                 BACKEND LAYER (FastAPI)                       │
│  ┌─────────┐  ┌───────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Routes  │→│Controllers│→│ Services  │→│   Models   │  │
│  └─────────┘  └───────────┘  └──────────┘  └────────────┘  │
│                      │                                       │
│  ┌───────────────────┴───────────────────────────────────┐  │
│  │              WebSocket Manager + Bridge                │  │
│  └───────────────────┬───────────────────────────────────┘  │
└──────────────────────┼──────────────────────────────────────┘
                       │ TCP / UDP Sockets
┌──────────────────────┼──────────────────────────────────────┐
│              NETWORKING LAYER                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐              │
│  │TCP Server│  │UDP Server│  │  Protocols   │              │
│  │& Client  │  │& Client  │  │(Base/TCP/UDP)│              │
│  └──────────┘  └──────────┘  └──────────────┘              │
│  ┌──────────────┐  ┌──────────────────────────┐             │
│  │   Packets    │  │    Serialization          │             │
│  │(Build/Parse) │  │ (JSON/Binary/Codec)       │             │
│  └──────────────┘  └──────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
                       │
┌──────────────────────┼──────────────────────────────────────┐
│               SHARED DEFINITIONS                             │
│  Constants │ Protocol Defs │ Message Formats │ Error Codes   │
└─────────────────────────────────────────────────────────────┘
```

## Design Principles

1. **Clean Architecture** — Dependencies flow inward (UI → App → Domain → Infra)
2. **Separation of Concerns** — Each layer handles its specific responsibility
3. **Protocol Abstraction** — All protocols implement a common interface
4. **Module Independence** — Networking can be used without the web framework
5. **Contract-Driven** — Shared module defines the contracts between layers

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| FastAPI over Flask | Async support, automatic OpenAPI docs, Pydantic validation |
| React + Vite over CRA | Faster dev builds, better tree-shaking, modern ESM |
| Separate networking module | Keeps socket logic testable and reusable |
| Builder pattern for packets | Clean, readable packet construction |
| Context-based state management | Simpler than Redux for this scale |
| JSON + Binary serialization | JSON for dev/debug, binary for production perf |
