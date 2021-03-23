import { Meteor } from "meteor/meteor";
import WebSocket from "ws";
import { TransactionsCollection } from "../imports/api/transactions";
import { rawToMega } from "nano-unit-converter";

Meteor.startup(() => {
  const ws = new WebSocket("wss://ws.mynano.ninja/");

  //Websocket events
  ws.on("open", function open() {
    const subscribeMessage = {
      action: "subscribe",
      topic: "confirmation",
      ack: true,
    };
    ws.send(JSON.stringify(subscribeMessage));
  });

  ws.on(
    "message",
    Meteor.bindEnvironment((data) => {
      try {
        const jsonData = JSON.parse(data);
        const transaction = transactionDTO(jsonData);
        if (transaction) TransactionsCollection.insert(transaction);
      } catch (err) {
        console.error(err);
      }
    })
  );

  ws.on("close", (err) => {
    console.log("Websocket disconnected", err);
  });

  //Clear old data
  clearOldData();
  setInterval(() => clearOldData(), 3600000);
});

Meteor.methods({
  getTransactionsAmountAverage: async () => {
    const result = await TransactionsCollection.rawCollection()
      .aggregate([{ $group: { _id: null, avg: { $avg: "$amountNano" } } }])
      .toArray();
    if (result && result[0]) return result[0].avg;
  },
});

const transactionDTO = (rawTransaction) => {
  if (
    !rawTransaction.message ||
    rawTransaction.message?.block?.subtype === "send"
  ) {
    return null;
  }
  const transaction = {
    hash: rawTransaction.message.hash,
    timestamp: new Date(parseInt(rawTransaction.time)),
    amountNano: parseFloat(rawToMega(parseInt(rawTransaction.message.amount))),
    amountRaw: parseInt(rawTransaction.message.amount),
    createdAt: new Date(),
  };
  return transaction;
};

const clearOldData = Meteor.bindEnvironment(() => {
  const oneDayAgo = new Date();
  oneDayAgo.setHours(oneDayAgo.getHours() - 24);
  TransactionsCollection.remove({ createdAt: { $lt: oneDayAgo } });
});

Meteor.publish("largestTransactions", (hours, limit) => {
  const begin = new Date();
  begin.setHours(begin.getHours() - hours);
  return TransactionsCollection.find(
    { createdAt: { $gt: begin } },
    { sort: { amountRaw: -1 }, limit }
  );
});
