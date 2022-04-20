import React from "react";

export default Loading = ({ text }) => (
  <div className="loading-balls">
    <img src="images/loading.gif" />
    <span>{text}</span>
  </div>
);
