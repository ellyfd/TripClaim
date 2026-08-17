import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("booking comparison revalidates from the server after shared travel data changes",async()=>{
 const source=await read("app/BookingPanel.tsx");
 assert.match(source,/useCallback/);
 assert.match(source,/const load=useCallback\(async\(\)=>/);
 assert.match(source,/window\.addEventListener\("tripclaim:data-changed",reload\)/);
 assert.match(source,/window\.removeEventListener\("tripclaim:data-changed",reload\)/);
 assert.match(source,/void load\(\)/);
});

test("travel todos revalidate from active booking evidence after shared data changes",async()=>{
 const source=await read("app/TripTodoPanel.tsx");
 assert.match(source,/useCallback/);
 assert.match(source,/const loadTodos=useCallback\(async\(\)=>/);
 assert.match(source,/window\.addEventListener\("tripclaim:data-changed",reload\)/);
 assert.match(source,/window\.removeEventListener\("tripclaim:data-changed",reload\)/);
 assert.match(source,/void loadTodos\(\)/);
});

test("travel write and delete paths still emit the common revalidation event",async()=>{
 const [todo,booking]=await Promise.all([read("app/TripTodoPanel.tsx"),read("app/BookingPanel.tsx")]);
 assert.match(todo,/window\.dispatchEvent\(new Event\("tripclaim:data-changed"\)\)/);
 assert.match(booking,/window\.dispatchEvent\(new Event\("tripclaim:data-changed"\)\)/);
});
