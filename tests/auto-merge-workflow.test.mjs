import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("auto merge does not couple successful merge to branch deletion",async()=>{
 const source=await read(".github/workflows/auto-test-merge.yml");
 const mergeStart=source.indexOf('gh pr merge "$PR_NUMBER"');
 const cleanupStart=source.indexOf('if git push origin --delete "$HEAD_BRANCH"');
 assert.ok(mergeStart>=0);
 assert.ok(cleanupStart>mergeStart);
 const mergeCommand=source.slice(mergeStart,cleanupStart);
 assert.match(mergeCommand,/--squash/);
 assert.match(mergeCommand,/--match-head-commit "\$TESTED_SHA"/);
 assert.doesNotMatch(mergeCommand,/--delete-branch/);
});

test("post-merge branch cleanup is explicitly best effort",async()=>{
 const source=await read(".github/workflows/auto-test-merge.yml");
 assert.match(source,/HEAD_BRANCH: \$\{\{ github\.event\.pull_request\.head\.ref \}\}/);
 assert.match(source,/if git push origin --delete "\$HEAD_BRANCH"; then/);
 assert.match(source,/::warning::PR 已成功合併/);
 assert.match(source,/保留 branch 不影響 main/);
});

test("mergeable lookup retries transient GitHub API failures but fails closed",async()=>{
 const source=await read(".github/workflows/auto-test-merge.yml");
 assert.match(source,/state="UNKNOWN"/);
 assert.match(source,/for attempt in 1 2 3 4 5; do/);
 assert.match(source,/if state=\$\(gh pr view "\$PR_NUMBER"/);
 assert.match(source,/if \[ "\$state" = "UNKNOWN" \]; then/);
 assert.match(source,/無法確認 PR mergeable 狀態，停止合併/);
});

test("merge API retries only with the exact tested head",async()=>{
 const source=await read(".github/workflows/auto-test-merge.yml");
 const retryStart=source.indexOf("merged=false");
 const cleanupStart=source.indexOf("# Branch cleanup",retryStart);
 const retryBlock=source.slice(retryStart,cleanupStart);
 assert.match(retryBlock,/for attempt in 1 2 3; do/);
 assert.match(retryBlock,/if gh pr merge "\$PR_NUMBER"/);
 assert.match(retryBlock,/--match-head-commit "\$TESTED_SHA"/);
 assert.match(retryBlock,/if \[ "\$merged" != "true" \]; then/);
 assert.match(retryBlock,/PR 未能以 tested head \$TESTED_SHA 合併/);
});
