/**
 * Declarative WebMCP (a proposed W3C standard, in a Chrome origin trial in
 * 2026): attributes that describe a form as a tool an AI agent in the
 * browser can call, instead of guessing at the page. Browsers without it
 * ignore them. https://developer.chrome.com/docs/lighthouse/agentic-browsing/webmcp-schema-validity
 */
import "react";

// T is required for declaration merging with React's own interfaces.
/* eslint-disable @typescript-eslint/no-unused-vars */
declare module "react" {
  interface FormHTMLAttributes<T> {
    /** The tool's name, e.g. "search_deals". Needs a tooldescription. */
    toolname?: string;
    /** What the tool does, in a sentence an agent can act on. */
    tooldescription?: string;
  }
  interface InputHTMLAttributes<T> {
    /** What value the agent should put in this field. */
    toolparamdescription?: string;
  }
}
