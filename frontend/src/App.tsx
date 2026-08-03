import React from "react";
import AppRouter from "./router/AppRouter";
import { AppProviders } from "./app/AppProviders";

function App(): React.ReactElement {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}

export default App;
