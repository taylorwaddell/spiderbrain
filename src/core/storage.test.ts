import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { NodeNotFoundError } from "./types";
import { NodeStorage } from "./storage";
import { promises as fs } from "fs";
import { join } from "path";

describe("NodeStorage", () => {
  const testDataPath = join(process.cwd(), "data", "test-nodes.jsonl");
  let storage: NodeStorage;

  beforeEach(async () => {
    // Ensure test directory exists
    await fs.mkdir(join(process.cwd(), "data"), { recursive: true });
    storage = new NodeStorage(testDataPath);
    await storage.initialize();
  });

  afterEach(async () => {
    // Clean up test file
    try {
      await fs.unlink(testDataPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  it("should create a new node", async () => {
    const node = await storage.create({
      raw_text: "Test node",
      tags: ["test"],
    });

    expect(node).toMatchObject({
      raw_text: "Test node",
      tags: ["test"],
    });
    expect(node.id).toBeDefined();
    expect(node.timestamp).toBeDefined();
  });

  it("should get a node by id", async () => {
    const created = await storage.create({
      raw_text: "Test node",
      tags: ["test"],
    });

    const retrieved = await storage.get(created.id);
    expect(retrieved).toEqual(created);
  });

  it("should throw NodeNotFoundError when getting non-existent node", async () => {
    await expect(storage.get("non-existent")).rejects.toThrow(
      NodeNotFoundError
    );
  });

  it("should update a node", async () => {
    const created = await storage.create({
      raw_text: "Test node",
      tags: ["test"],
    });

    const updated = await storage.update(created.id, {
      raw_text: "Updated node",
      tags: ["updated"],
    });

    expect(updated).toMatchObject({
      id: created.id,
      raw_text: "Updated node",
      tags: ["updated"],
    });
  });

  it("should delete a node", async () => {
    const created = await storage.create({
      raw_text: "Test node",
      tags: ["test"],
    });

    await storage.delete(created.id);
    await expect(storage.get(created.id)).rejects.toThrow(NodeNotFoundError);
  });

  it("should list all nodes", async () => {
    const node1 = await storage.create({
      raw_text: "Node 1",
      tags: ["test"],
    });

    const node2 = await storage.create({
      raw_text: "Node 2",
      tags: ["test"],
    });

    const nodes = await storage.list();
    expect(nodes).toHaveLength(2);
    expect(nodes).toEqual(expect.arrayContaining([node1, node2]));
  });

  it("should count nodes", async () => {
    await storage.create({
      raw_text: "Node 1",
      tags: ["test"],
    });

    await storage.create({
      raw_text: "Node 2",
      tags: ["test"],
    });

    const count = await storage.count();
    expect(count).toBe(2);
  });

  it("should persist nodes between instances", async () => {
    const node = await storage.create({
      raw_text: "Test node",
      tags: ["test"],
    });

    // Create new storage instance
    const newStorage = new NodeStorage(testDataPath);
    await newStorage.load();

    const retrieved = await newStorage.get(node.id);
    expect(retrieved).toEqual(node);
  });
});
