import React from "react";
import { RadioButton } from "./";

export default Info = (props) => {
  const {
    mode,
    setMode,
    timePeriod,
    setTimePeriod,
    limit,
    setLimit,
    speed,
    setSpeed,
    showAll,
    setShowAll,
  } = props;
  return (
    <div className="info">
      <div className="info-card">
        <img src="images/nano-logo.png" className="nano-logo" />
        <h1>NANO Bubbles</h1>
        <p>
          Bubbles are a great way to visualize NANO network transaction stats.
          Use the [ALL] mode to view all nano transactions as moving bubbles. In
          the [LARGEST] mode you will see the largest sent transactions
          represented in a bubble chart. Both visualizations are updated in
          real-time and have a configuration parameters.
        </p>
        <div className="configuration">
          <div className="mode">
            <div className="flex mode-selection">
              <div
                onClick={() => setMode("ALL")}
                className={`mode-select ${
                  mode === "ALL" ? "active" : "inactive"
                }`}
              >
                Transaction Rate
              </div>
              <div className="mode-select-separator"></div>
              <div
                onClick={() => setMode("LARGEST")}
                className={`mode-select ${
                  mode === "LARGEST" ? "active" : "inactive"
                }`}
              >
                Largest Transactions
              </div>
            </div>
          </div>
          {mode === "LARGEST" && (
            <div className="params">
              <div>
                <h3>Time Interval</h3>
                <RadioButton
                  label="24h"
                  checked={timePeriod === 24}
                  onChange={() => setTimePeriod(24)}
                />
                <RadioButton
                  label="12h"
                  checked={timePeriod === 12}
                  onChange={() => setTimePeriod(12)}
                />
                <RadioButton
                  label="1h"
                  checked={timePeriod === 1}
                  onChange={() => setTimePeriod(1)}
                />
              </div>
              <div>
                <h3>Limit</h3>
                <RadioButton
                  label="50txs"
                  checked={limit === 50}
                  onChange={() => setLimit(50)}
                />
                <RadioButton
                  label="25txs"
                  checked={limit === 25}
                  onChange={() => setLimit(25)}
                />
                <RadioButton
                  label="10txs"
                  checked={limit === 10}
                  onChange={() => setLimit(10)}
                />
              </div>
            </div>
          )}
          {mode === "ALL" && (
            <div className="params column">
              <div>
                <h3>Speed</h3>
                <input
                  type="range"
                  min="20"
                  max="80"
                  step="10"
                  value={speed}
                  onChange={(e) => setSpeed(e.target.value)}
                />
              </div>
              <div>
                <h3>Filter</h3>
                <div className="flex" style={{ width: 400 }}>
                  <RadioButton
                    label="Show All"
                    checked={showAll}
                    onChange={() => setShowAll(true)}
                  />
                  <RadioButton
                    label="Show >= 1 NANO"
                    checked={!showAll}
                    onChange={() => setShowAll(false)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="social">
          <a
            href="https://tools.nanos.cc/?tool=pay&address=nano_1de86tibiz4q7pjhdu5b418zfgtq1nbwr3cpjimhse94wis843qomeo9t6fy&amount=&recipient=&message="
            target="_blank"
          >
            <img src="./icons/donate.svg" alt="Donate Nano" />
          </a>
          <a href="https://github.com/MMrj9/nano-bubbles" target="_blank">
            <img src="./icons/github.svg" alt="Github" />
          </a>
        </div>
      </div>
    </div>
  );
};
