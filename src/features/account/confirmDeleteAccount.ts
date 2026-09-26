import { Alert } from "react-native";
import { deleteMyAccount } from "./api";

/**
 * Two-step confirmation, then permanent deletion of the signed-in account:
 * profile, clients, cases, hearings, documents, transactions, posts, chats,
 * connections, notifications and every uploaded file. Signing out on success
 * sends the app back to the login screen.
 */
export function confirmDeleteAccount(setBusy: (busy: boolean) => void) {
  Alert.alert(
    "Delete your account?",
    "This permanently deletes your profile, clients, cases, hearings, documents, payments, posts, chats and connections, plus every file you've uploaded. It cannot be undone.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Continue",
        style: "destructive",
        onPress: () =>
          Alert.alert("Are you absolutely sure?", "Your account and all its data will be erased and can't be recovered.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete permanently",
              style: "destructive",
              onPress: async () => {
                setBusy(true);
                try {
                  await deleteMyAccount();
                } catch (err) {
                  setBusy(false);
                  Alert.alert("Couldn't delete account", err instanceof Error ? err.message : "Something went wrong");
                }
              },
            },
          ]),
      },
    ],
  );
}
