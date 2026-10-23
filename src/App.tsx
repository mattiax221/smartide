import { IdeShell } from "./components/layout/IdeShell";
import { IdeStoreProvider } from "./state/store";

export default function App() {
  return (
    <IdeStoreProvider>
      <IdeShell />
    </IdeStoreProvider>
  );
}
