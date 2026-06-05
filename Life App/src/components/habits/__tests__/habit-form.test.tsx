import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HabitForm } from "../habit-form";

// Prevent real API calls in the state-machine tests.
const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 1, name: "Test" }) });
vi.stubGlobal("fetch", mockFetch);

function renderWalkthrough(onCreated = vi.fn(), onClose = vi.fn()) {
  return render(
    <HabitForm open mode="walkthrough" onClose={onClose} onCreated={onCreated} />,
  );
}

async function fillIdentity(user: ReturnType<typeof userEvent.setup>) {
  const field = screen.getByRole("textbox");
  await user.type(field, "I am someone who moves every day");
}

async function fillName(user: ReturnType<typeof userEvent.setup>) {
  const field = screen.getByRole("textbox");
  await user.type(field, "Morning run");
}

describe("HabitForm walkthrough — state machine", () => {
  it("starts at step 1 (identity)", () => {
    renderWalkthrough();
    expect(screen.getByText("Who do you want to be?")).toBeInTheDocument();
    expect(screen.getByText("1/6")).toBeInTheDocument();
  });

  it("Next is disabled when identity is empty", () => {
    renderWalkthrough();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("Next becomes enabled once identity is filled", async () => {
    const user = userEvent.setup();
    renderWalkthrough();
    await fillIdentity(user);
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });

  it("advances to step 2 (name) after filling identity and clicking Next", async () => {
    const user = userEvent.setup();
    renderWalkthrough();
    await fillIdentity(user);
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("What's the habit?")).toBeInTheDocument();
    expect(screen.getByText("2/6")).toBeInTheDocument();
  });

  it("Next on step 2 is disabled when name is empty", async () => {
    const user = userEvent.setup();
    renderWalkthrough();
    await fillIdentity(user);
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("Back on step 2 returns to step 1", async () => {
    const user = userEvent.setup();
    renderWalkthrough();
    await fillIdentity(user);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Who do you want to be?")).toBeInTheDocument();
  });

  it("step 3 (cue) has a Skip button since it is optional", async () => {
    const user = userEvent.setup();
    renderWalkthrough();
    await fillIdentity(user);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await fillName(user);
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("What triggers it?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
  });

  it("Skip on cue step advances without filling anything", async () => {
    const user = userEvent.setup();
    renderWalkthrough();
    await fillIdentity(user);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await fillName(user);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Skip" }));
    expect(screen.getByText("What's the two-minute version?")).toBeInTheDocument();
  });

  it("Skip on minimumVersion step reaches reward, then skip reaches review", async () => {
    const user = userEvent.setup();
    renderWalkthrough();
    await fillIdentity(user);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await fillName(user);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Skip" })); // skip cue
    await user.click(screen.getByRole("button", { name: "Skip" })); // skip minimumVersion
    expect(screen.getByText("What's your reward?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Skip" })); // skip reward
    expect(screen.getByText("Review your habit")).toBeInTheDocument();
    expect(screen.getByText("6/6")).toBeInTheDocument();
  });

  it("review shows the identity and name the user entered", async () => {
    const user = userEvent.setup();
    renderWalkthrough();
    await fillIdentity(user);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await fillName(user);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Skip" }));
    await user.click(screen.getByRole("button", { name: "Skip" }));
    await user.click(screen.getByRole("button", { name: "Skip" })); // skip reward
    expect(screen.getByText("I am someone who moves every day")).toBeInTheDocument();
    expect(screen.getByText("Morning run")).toBeInTheDocument();
  });

  it("Edit link on review navigates to that step", async () => {
    const user = userEvent.setup();
    renderWalkthrough();
    await fillIdentity(user);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await fillName(user);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Skip" }));
    await user.click(screen.getByRole("button", { name: "Skip" }));
    await user.click(screen.getByRole("button", { name: "Skip" })); // skip reward
    // Click the first Edit link (next to Identity)
    const editButtons = screen.getAllByRole("button", { name: "Edit" });
    await user.click(editButtons[0]);
    expect(screen.getByText("Who do you want to be?")).toBeInTheDocument();
  });

  it("Back on review returns to reward step", async () => {
    const user = userEvent.setup();
    renderWalkthrough();
    await fillIdentity(user);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await fillName(user);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Skip" }));
    await user.click(screen.getByRole("button", { name: "Skip" }));
    await user.click(screen.getByRole("button", { name: "Skip" })); // skip reward → review
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("What's your reward?")).toBeInTheDocument();
  });
});
