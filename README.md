
# @workadventure/ultimate-json

Ultimate-json allows you to unserialize JSON objects in a safe way into Typescript classes.
Those classes are observables: you can listen to changes on any fields of the objects.

Finally, the library was designed to be able to track changes on objects and send them to a third party (server or client)
in order to synchronize the state of the objects across multiple clients.

## Features

- Write Typescript classes and annotate each field serializable/unserializable with a decorator
- Unserialize JSON objects into Typescript classes
- Listen to changes on any fields of the objects
- Serialize the objects back to JSON
- Synchronize changes with remote third party

## Installation

```bash
  npm install @workadventure/ultimate-json
```

## Usage/Examples


