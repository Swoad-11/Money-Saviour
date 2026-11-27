import { useState } from "react";
import { Copy, Eye, EyeOff, KeyRound, Check, PlugZap } from "lucide-react";
import { Card } from "@/ui/Card";
import { Button, Field, Notice, TextInput } from "@/ui/controls";
import { ApiError, createHttpApi, generateToken, validateScriptUrl } from "@/data/api";
import { useConnection, type Source } from "@/state/connection";

type TestState =
  | { kind: "idle" }
  | { kind: "testing" }
  | { kind: "ok"; title: string; version: string }
  | { kind: "fail"; message: string };

const SOURCES: { value: Source; label: string; hint: string }[] = [
  { value: "sheet", label: "Google Sheet", hint: "Your monthly expense spreadsheet" },
  { value: "sample", label: "Sample data", hint: "Made-up data for trying the app" },
  { value: "none", label: "Not connected", hint: "" },
];

export function ConnectionCard() {
  const conn = useConnection();
  const [source, setSource] = useState<Source>(conn.source === "none" ? "sheet" : conn.source);
  const [scriptUrl, setScriptUrl] = useState(conn.scriptUrl);
  const [token, setToken] = useState(conn.token);
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const [test, setTest] = useState<TestState>({ kind: "idle" });
  const [saved, setSaved] = useState(false);

  const urlError = scriptUrl ? validateScriptUrl(scriptUrl) : null;
  const tokenError = /^https?:\/\//i.test(token.trim())
    ? "This is the Web app URL. Paste it in the field above, and put the MS_TOKEN value here."
    : /^AKfyc/.test(token.trim())
      ? "This is the deployment ID, not a token. Clear this field and use “Generate a token”, then save it as MS_TOKEN."
      : token && token.trim().length < 24
      ? "The token must be at least 24 characters."
      : null;
  const sheetReady = !!scriptUrl && !!token && !urlError && !tokenError;
  const dirty =
    source !== conn.source || scriptUrl.trim() !== conn.scriptUrl || token.trim() !== conn.token;

  async function runTest() {
    setTest({ kind: "testing" });
    try {
      const p = await createHttpApi({ scriptUrl: scriptUrl.trim(), token: token.trim() }).ping();
      setTest({ kind: "ok", title: p.title, version: p.version });
    } catch (e) {
      setTest({ kind: "fail", message: e instanceof ApiError ? e.message : String(e) });
    }
  }

  function save() {
    // URL and token are kept when switching to sample data, so switching back is one click.
    conn.set({ source, scriptUrl: scriptUrl.trim(), token: token.trim() });
    setSaved(true);
  }

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setShowToken(true);
    }
  }

  return (
    <Card title="Data source">
      <div className="grid gap-4">
        <div role="radiogroup" aria-label="Data source" className="grid gap-2 sm:grid-cols-3">
          {SOURCES.map((s) => (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={source === s.value}
              onClick={() => {
                setSource(s.value);
                setTest({ kind: "idle" });
                setSaved(false);
              }}
              className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                source === s.value ? "border-primary bg-primary-soft" : "border-line hover:bg-surface-muted"
              }`}
            >
              <span className="block text-[13px] font-medium">{s.label}</span>
              {s.hint && <span className="block text-xs text-muted">{s.hint}</span>}
            </button>
          ))}
        </div>

        {source === "sheet" && (
          <>
            <Field
              label="Web app URL"
              htmlFor="script-url"
              error={urlError}
              hint="Apps Script > Deploy > Manage deployments > Web app URL"
            >
              <TextInput
                id="script-url"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                placeholder="https://script.google.com/macros/s/…/exec"
                value={scriptUrl}
                onChange={(e) => {
                  setScriptUrl(e.target.value);
                  setTest({ kind: "idle" });
                  setSaved(false);
                }}
              />
            </Field>

            <Field
              label="Access token"
              htmlFor="token"
              error={tokenError}
              hint="Saved on this device only. Put the same value in the script property MS_TOKEN."
            >
              <div className="flex gap-2">
                <TextInput
                  id="token"
                  type={showToken ? "text" : "password"}
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    setTest({ kind: "idle" });
                    setSaved(false);
                  }}
                />
                <Button
                  variant="ghost"
                  aria-label={showToken ? "Hide token" : "Show token"}
                  onClick={() => setShowToken((v) => !v)}
                >
                  {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
                <Button variant="ghost" aria-label="Copy token" disabled={!token} onClick={copyToken}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </Button>
              </div>
            </Field>
            {!token && (
              <div>
                <Button
                  onClick={() => {
                    setToken(generateToken());
                    setShowToken(true);
                  }}
                >
                  <KeyRound size={15} /> Generate a token
                </Button>
              </div>
            )}

            <details className="rounded-lg border border-line px-3 py-2 text-[13px]">
              <summary className="cursor-pointer font-medium">How to set up the script</summary>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
                <li>Open your expense spreadsheet, then Extensions › Apps Script.</li>
                <li>Replace the contents of Code.gs with apps-script/Code.gs from this project and save.</li>
                <li>Project Settings › Script properties › Add: name MS_TOKEN, value = the token above.</li>
                <li>Deploy › New deployment › Web app. Execute as: Me. Who has access: Anyone. Authorize.</li>
                <li>Copy the Web app URL into the field above, then Test connection.</li>
              </ol>
            </details>

            {test.kind === "ok" && (
              <Notice tone="success">
                Connected to <strong>{test.title}</strong> (backend {test.version}).
              </Notice>
            )}
            {test.kind === "fail" && <Notice tone="danger">{test.message}</Notice>}
          </>
        )}

        {source === "sheet" && !sheetReady && !urlError && !tokenError && (
          <p className="text-xs text-muted">
            {!scriptUrl.trim() ? "Add the Web app URL" : "Add the access token"} to test and save.
          </p>
        )}
        {saved && !dirty && (
          <Notice tone="success">
            Saved.{" "}
            {source === "sheet"
              ? "The app now reads your spreadsheet. See Sync below."
              : source === "sample"
                ? "Showing sample data."
                : "Disconnected."}
          </Notice>
        )}
        <div className="flex flex-wrap gap-2">
          {source === "sheet" && (
            <Button disabled={!sheetReady || test.kind === "testing"} onClick={runTest}>
              <PlugZap size={15} /> {test.kind === "testing" ? "Testing…" : "Test connection"}
            </Button>
          )}
          <Button
            variant="primary"
            disabled={!dirty || (source === "sheet" && !sheetReady)}
            onClick={save}
          >
            Save
          </Button>
        </div>
      </div>
    </Card>
  );
}
