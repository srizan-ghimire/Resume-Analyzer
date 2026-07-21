/**
 * Render smoke tests.
 *
 * These exist because a `Button asChild` shipped two children into Radix's
 * Slot, which throws at render time. Typecheck and build both passed; the site
 * still crashed on load. Only actually rendering catches that class of bug.
 */
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AppRoutes } from "@/app/routes";
import { Button } from "@/components/ui/Button";
import { JobCard } from "@/components/jobs/JobCard";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import type { Job } from "@/api/types";
import { renderApp } from "./render";

const JOB: Job = {
  id: 1,
  job_title: "Senior Data Scientist",
  company_name: "Acme Analytics",
  location: "Remote",
  is_remote: true,
  job_type: "FULL_TIME",
  job_type_display: "Full-Time",
  salary_min: "120000",
  salary_max: "160000",
  salary_currency: "USD",
  job_description: "Build models.",
  job_requirements: "Python\nSQL",
  skills: ["Python", "SQL"],
  posted_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  expiry_time: null,
  is_active: true,
  is_open: true,
  recruiter: 1,
  recruiter_name: "Rec Ruiter",
  application_count: 0,
  has_applied: false,
} as Job;

describe("Button", () => {
  it("renders a plain button", () => {
    renderApp(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("renders asChild as a link without throwing", () => {
    // The exact shape that crashed: Slot must receive one element child.
    renderApp(
      <Button asChild>
        <a href="/jobs">Browse jobs</a>
      </Button>,
    );
    expect(screen.getByRole("link", { name: "Browse jobs" })).toBeInTheDocument();
  });

  it("shows a spinner and disables while loading", () => {
    renderApp(<Button loading>Saving</Button>);
    const button = screen.getByRole("button", { name: /Saving/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});

describe("JobCard", () => {
  it("renders title, company and a link to the detail page", () => {
    renderApp(<JobCard job={JOB} />);
    expect(screen.getByRole("link", { name: /Senior Data Scientist/ })).toHaveAttribute(
      "href",
      "/jobs/1",
    );
    expect(screen.getByText("Acme Analytics")).toBeInTheDocument();
  });

  it("formats the salary range", () => {
    renderApp(<JobCard job={JOB} />);
    expect(screen.getByText(/\$120,000\s*–\s*\$160,000/)).toBeInTheDocument();
  });

  it("shows the match percentage when given one", () => {
    renderApp(<JobCard job={JOB} matchPercentage={84} matchedSkills={["Python"]} />);
    expect(screen.getByText("84%")).toBeInTheDocument();
  });
});

describe("Dialog", () => {
  it("opens, traps a title, and closes on Escape", async () => {
    const user = userEvent.setup();
    renderApp(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open</Button>
        </DialogTrigger>
        <DialogContent title="Confirm action" description="Are you sure?">
          <p>Body</p>
        </DialogContent>
      </Dialog>,
    );

    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Confirm action")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("routes", () => {
  it("renders the landing page without crashing", async () => {
    renderApp(<AppRoutes />, { route: "/" });
    expect(
      await screen.findByRole("heading", {
        name: /Find out why your resume isn't getting through/i,
      }),
    ).toBeInTheDocument();
  });

  it("landing page CTAs are real links", async () => {
    renderApp(<AppRoutes />, { route: "/" });
    const cta = await screen.findByRole("link", { name: /Analyze my resume/i });
    expect(cta).toHaveAttribute("href", "/register");
  });

  it("renders the 404 page for an unknown route", async () => {
    renderApp(<AppRoutes />, { route: "/nope" });
    expect(await screen.findByText("404")).toBeInTheDocument();
  });

  it("redirects an anonymous visitor from a guarded route to login", async () => {
    renderApp(<AppRoutes />, { route: "/applications" });
    expect(
      await screen.findByRole("heading", { name: /Welcome back/i }),
    ).toBeInTheDocument();
  });

  it("renders the login form with labelled fields", async () => {
    renderApp(<AppRoutes />, { route: "/login" });
    expect(await screen.findByLabelText(/Username/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/)).toBeInTheDocument();
  });

  it("renders the register form and reveals the company field for recruiters", async () => {
    const user = userEvent.setup();
    renderApp(<AppRoutes />, { route: "/register" });

    expect(await screen.findByLabelText(/^Username/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Company/)).not.toBeInTheDocument();

    await user.click(screen.getByText("Recruiter"));
    expect(await screen.findByLabelText(/^Company/)).toBeInTheDocument();
  });

  it("validates the login form before calling the API", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    renderApp(<AppRoutes />, { route: "/login" });

    await user.click(await screen.findByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter your username")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
