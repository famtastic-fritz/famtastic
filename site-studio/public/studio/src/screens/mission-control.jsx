/* Mission Control — iframe-wraps the existing /operator.html?embedded=1.
   Operator action layer (commit ff9ae42, verified by browser smoke) is preserved
   intact. Future passes can fold panels into native shell primitives. */

function ScreenMissionControl() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <SectionHeader
        eyebrow="Mission Control"
        title="The honest view of what's running."
        sub="One section among twelve. Operator workspace, intelligence brief, capability truth, run ledger, proof packet, blockers, learning."
        right={[
          <Tag key="lc" tone="ember">embedded · /operator.html?embedded=1</Tag>,
          <Btn key="op" kind="ghost" icon="arrowUpRight" onClick={() => window.open("/operator.html", "_blank")}>Open standalone</Btn>,
        ]}
      />
      <div className="embed-wrap" style={{ flex: 1, minHeight: 480 }}>
        <iframe
          src="/operator.html?embedded=1"
          title="FAMtastic Mission Control (embedded)"
        />
      </div>
      <Hint style={{ marginTop: 10 }}>
        The Operator action layer (commit <span className="mono">ff9ae42</span>) is verified end-to-end (see <span className="mono">OPERATOR-ACTION-BROWSER-VERIFY-REPORT.md</span>). Native panel migration comes after the shell is stable.
      </Hint>
    </div>
  );
}

Object.assign(window, { ScreenMissionControl });
