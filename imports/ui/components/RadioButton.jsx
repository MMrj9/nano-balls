import React from "react";

const RadioButton = (props) => {
  const { label, checked, onChange } = props;
  return (
    <label className="container">
      <span className="label">{label}</span>
      <input type="checkbox" checked={checked} onChange={() => onChange()} />
      <span className="checkmark"></span>
    </label>
  );
};

export default RadioButton;
