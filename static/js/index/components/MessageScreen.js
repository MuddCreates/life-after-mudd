"use strict";

import React from "react";

// Higher-order component that takes any number of components and
// wraps them so they're displayed in a vertical column at the center
// of the screen.
export default function MessageScreen(...items) {
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        maxWidth: "90%",
        wordWrap: "break-word",
      }}
    >
      <div
        style={{
          maxWidth: "6in",
        }}
      >
        <center>
          {items.map((jsx, idx) => {
            const Item = () => jsx;
            return <Item key={idx} />;
          })}
        </center>
      </div>
    </div>
  );
}
