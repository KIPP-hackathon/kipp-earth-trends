import {expect,it} from "vitest";
import {combinedImergLayers} from "./layers";
it("retains a currently selected Late layer as combined precipitation",()=>{
  expect(combinedImergLayers([{variable:"rainfall_late",visible:true,opacity:.6}]))
    .toEqual([{variable:"rainfall",visible:true,opacity:.6}]);
});
it("deduplicates Final/Late selections without hiding a visible layer",()=>{
  expect(combinedImergLayers([{variable:"rainfall",visible:false,opacity:.4},
    {variable:"rainfall_late",visible:true,opacity:.8},{variable:"temperature",visible:true,opacity:1}]))
    .toEqual([{variable:"rainfall",visible:true,opacity:.8},{variable:"temperature",visible:true,opacity:1}]);
});
