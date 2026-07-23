import AppRouter from "./router/AppRouter";
import { AppProviders } from "./app/AppProviders";

function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}

export default App;