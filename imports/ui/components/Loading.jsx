import React from "react";

export default Loading = ({ text }) => (
  <div className="loading-bubbles">
    <img src="images/loading.gif" />
    <span>{text}</span>
  </div>
);
