import React, { useState, useEffect } from "react";
import { useTracker } from "meteor/react-meteor-data";
import { TransactionsCollection } from "../api/transactions";
import { BubbleChart, Bubbles, Info } from "./components";

export const App = () => {
  const [mode, setMode] = useState("LARGEST");
  const [timePeriod, setTimePeriod] = useState(24);
  const [limit, setLimit] = useState(50);
  const [speed, setSpeed] = useState(50);

  const loadingBubbleChart = useTracker(() => {
    if (mode === "LARGEST") {
      const handle = Meteor.subscribe("largestTransactions", timePeriod, limit);
      return !handle.ready();
    }
  }, [timePeriod, limit, mode]);

  const largestTransactions = useTracker(
    () => TransactionsCollection.find({}).fetch(),
    []
  );

  return (
    <div>
      <div className="content">
        <Info
          mode={mode}
          setMode={setMode}
          timePeriod={timePeriod}
          setTimePeriod={setTimePeriod}
          limit={limit}
          setLimit={setLimit}
          speed={speed}
          setSpeed={setSpeed}
        />
        {mode === "ALL" && <Bubbles speed={speed} />}
        {mode === "LARGEST" && (
          <BubbleChart
            data={generateChartData(largestTransactions)}
            timePeriod={timePeriod}
            limit={limit}
            loading={loadingBubbleChart}
          />
        )}
        <div id="nano-address">
          <span>
            nano_1de86tibiz4q7pjhdu5b418zfgtq1nbwr3cpjimhse94wis843qomeo9t6fy
          </span>
        </div>
      </div>
    </div>
  );
};

const generateChartData = (transactions) => {
  return transactions.map((tx) => {
    tx.v = tx.amountRaw;
    return tx;
  });
};
