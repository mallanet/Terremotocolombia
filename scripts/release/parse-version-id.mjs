#!/usr/bin/env node
import fs from "node:fs";
import { parseWorkerVersionId } from "./promote-identity.mjs";

const stdout = fs.readFileSync(0, "utf8");
process.stdout.write(`${parseWorkerVersionId(stdout)}\n`);
