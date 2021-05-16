import React from "react";

export function NoTokensMessage({ selectedAddress }) {
  return (
    <>
      <p>You don't have enough ETH to make a bet transaction.</p>
      <p>
        Please make sure this account have enough ETH or switch other accout.
        <br />
      </p>
    </>
  );
}
