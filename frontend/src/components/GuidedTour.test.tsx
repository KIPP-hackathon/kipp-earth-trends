import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { GuidedTour } from "./GuidedTour";

const steps = [
  { id: "a", title: "First", body: "One" },
  { id: "b", title: "Last", body: "Two", target: ".missing" },
];
const render = (step: number) =>
  renderToStaticMarkup(
    createElement(GuidedTour, {
      steps,
      step,
      onStep: () => {},
      onClose: () => {},
    }),
  );

it("shields the page from stray clicks right after a step changes", () => {
  // A quick second click must not reach links under the moving card,
  // such as the footer logo that opens Explore.
  expect(render(1)).toContain('class="guided-tour-shield"');
});

it("labels the last step's button Finish", () => {
  expect(render(1)).toContain(">Finish<");
  expect(render(0)).toContain(">Next<");
});
