# Event Sourcing in TypeScript

A personal exploration of event sourcing in TypeScript by [Waimun Yeow](https://github.com/waimun).

## How I got here

In 2017, while working at a healthcare startup in New York City, I came across domain-driven design for the first time. Two years later, I attended Vaughn Vernon’s “Domain-Driven Design with Message- and Event-Driven Architectures” workshop at QCon New York. That was when I began learning more about CQRS, event sourcing, and modeling uncertainty.

I never developed a strong working knowledge of these ideas through my professional career, nor did I have the opportunity to deploy them in production. Those opportunities were difficult to find. I had always worked at fast-paced companies where most of what we built followed familiar CRUD patterns.

Over the years, I picked up pieces of the bigger picture wherever I could. I read and researched in my spare time, experimented with code, and gradually connected ideas from different sources. I found Eric Evans’ blue book, articles by Martin Fowler and Microsoft, and some excellent examples written by practitioners in the PHP and C# communities. Little by little, I began assembling the patterns that eventually led to this repository.

Along the way, three ideas became a kind of north star for how I approach the code: domain-driven design keeps the model and its ubiquitous language close to the problem; hexagonal architecture keeps that model independent of frameworks and infrastructure; and Screaming Architecture reminds me that the structure of the code should reveal what the application does. I do not treat them as rigid recipes, but as guardrails that help me decide where behavior and contracts belong, how dependencies should be directed, and whether the code still tells the story of the domain.

## What it is

This repository is where I put those ideas into practice. It is a working exploration of event sourcing, domain-driven design, CQRS, and clean architecture in TypeScript. More than a collection of isolated patterns, it is an attempt to see how they fit together in a complete application—from a business decision in the domain to an event in a journal and, eventually, back out through an API.

### Where the model came from

I did not set out to invent a shipping domain. I needed something small enough to understand but rich enough to experiment with, so I borrowed the ships, cargo, and ports model from Martin Fowler’s [Event Sourcing](https://www.martinfowler.com/eaaDev/EventSourcing.html) article and used it as a working example.

Fowler’s example follows ships as they arrive at and depart from ports while cargo is loaded and unloaded. This repository takes that starting point and develops its own model around it. Ships are registered at a port, containers are loaded and unloaded, voyages are planned, ships sail and arrive, and a voyage can be diverted while it is underway.

### The aggregate

The `Ship` is the aggregate and consistency boundary. Ports, voyages, and containers are modeled through their relationship to a ship, and every accepted change to that aggregate is recorded in its event stream. Its lifecycle currently looks like this:

```text
Unregistered
    │ RegisterShip (ShipRegistered)
At port
    ├── LoadContainer (ContainerLoaded)
    ├── UnloadContainer (ContainerUnloaded)
    │
    │ PlanVoyage (VoyagePlanned)
At port with an active voyage
    ├── Load or unload containers
    │
    │ SailShip (ShipDeparted)
At sea with an active voyage
    ├── DivertShip (VoyageDiverted)
    │
    │ DockShip (ShipArrived)
At port
```

The lifecycle is constrained by a few central business rules:

- A ship must be registered before anything else can happen.
- Containers can only be loaded or unloaded while the ship is at a port.
- A voyage must start at the ship’s current port and have a different destination.
- A ship cannot depart without a planned voyage.
- A voyage can only be diverted while the ship is at sea.
- A ship can only arrive at its active destination.

Commands express an intent. Events record the fact that the intent was accepted. A successful `PlanVoyage`, for example, produces a `VoyagePlanned`; a rejected command produces no event. Applying an event produces a new immutable `Ship` state, and replaying the complete sequence reconstructs its present state. The aggregate protects the rules during that replay, so an invalid or malformed history cannot silently become valid state.

### From a request to an event

The path through the application follows the same shape for each command:

```text
HTTP request
    │
Handler
    │
Controller
    │
Application use case
    ├── Load the event stream
    ├── Replay it into a Ship
    ├── Ask the Ship to decide
    └── Append the resulting event
```

The HTTP boundary deals with transport concerns, while the controller validates input and constructs domain values. The application use case coordinates the operation: it reads the ship’s history, reconstructs the aggregate, passes it a command, and appends the resulting event. The domain itself does not know how requests arrive or how its events are stored.

Each append includes the version of the stream that was originally read. If another command writes to that stream first, the journal reports a version conflict instead of overwriting history. The application then reruns the command against the latest events, up to a bounded number of attempts, allowing the domain to reconsider the decision using current state. Expected domain failures remain distinct from unexpected infrastructure failures and are translated deliberately as they travel back toward the API.

### Layers and responsibilities

The code is arranged so that the domain sits at the center and infrastructure stays at the edges:

```text
bootstrap
└── wires the application together
    ├── inbound adapters
    │   └── HTTP routes, handlers, and controllers
    ├── application
    │   ├── use cases and application results
    │   ├── concurrency handling
    │   └── ports describing required capabilities
    ├── domain
    │   └── commands, events, values, and business rules
    └── outbound adapters
        ├── event-journal persistence
        └── query projections
```

The bootstrap composition root is the one place that knows which concrete pieces belong together. It creates the journal, use cases, projections, controllers, and HTTP application, then connects them through their interfaces. This keeps construction decisions out of the domain and makes the boundaries visible.

### Persistence as an adapter

Event persistence sits behind an application port. Its contract is concerned with capabilities: reading an aggregate’s ordered event stream and appending new events at an expected version. A storage adapter owns the mechanics of representing and retrieving those events.

Because the aggregate and its use cases depend on that port rather than a storage technology, adapters can be added or replaced without moving persistence concerns into the domain. The composition root selects and supplies the concrete implementation when the application starts.

### An evolving read side

Queries take a separate path from commands. Rather than exposing the aggregate itself, a projection turns its events into a view shaped for a particular question. The ship-history projection is the first implementation of this boundary, not the intended final form of the read side.

As the application needs to answer more questions, additional projections can evolve independently and use representations suited to their readers. This establishes the direction of CQRS in the repository: commands use the domain model to make decisions, while queries use models designed for reading.

Together, these parts let the repository explore more than storing events. It demonstrates rebuilding state from history, validating that history, serializing events through explicit mappings, handling concurrent decisions, separating write and read concerns, and replacing infrastructure at the application boundary. The ships and containers make those ideas concrete; the real subject of the repository is how the pieces work together.

## Where I want to take it

This repository is still evolving. I want it to remain a place where I can turn concepts I have read about into working code, test their boundaries, and understand the tradeoffs that are difficult to see from an isolated example.

Some of the directions I want to explore are:

- Additional event-journal adapters with different storage characteristics.
- Richer projections that can grow into independently maintained read models.
- Sagas for coordinating longer-running processes across multiple decisions or aggregates.
- An outbox for reliably publishing events beyond the transaction that recorded them.
- Equivalent implementations in other programming languages.

These are directions rather than capabilities the repository claims today. As they become part of the working model, this README should evolve with them and explain how they change the architecture as a whole.
