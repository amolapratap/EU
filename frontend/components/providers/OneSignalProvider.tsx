// "use client";

// import { useEffect } from "react";

// import OneSignal from "react-onesignal";


// export default function OneSignalProvider() {

//   useEffect(() => {


//     console.log("OneSignal Init");
//     console.log(
//         process.env
//           .NEXT_PUBLIC_ONESIGNAL_APP_ID
//       );

//     OneSignal.init({

//       appId:
//         process.env
//           .NEXT_PUBLIC_ONESIGNAL_APP_ID!,

//     //   notifyButton: {
//     //     enable: true,
//     //   },

//       allowLocalhostAsSecureOrigin: true,

//     });

//   }, []);

//   return null;
// }



"use client";

import { useEffect } from "react";

export default function OneSignalProvider() {

  useEffect(() => {

    if (typeof window === "undefined") return;

    const init = async () => {

      const OneSignal = (await import(
        "react-onesignal"
      )).default;

      await OneSignal.init({

        appId:
          process.env
            .NEXT_PUBLIC_ONESIGNAL_APP_ID!,

        allowLocalhostAsSecureOrigin: true,

        notifyButton: {
          enable: true,
          prenotify: true,
          showCredit: false,
          text: {
            "tip.state.unsubscribed": "Subscribe to notifications",
            "tip.state.subscribed": "You're subscribed to notifications",
            "tip.state.blocked": "You've blocked notifications",
            "message.prenotify": "Click to subscribe to notifications",
            "message.action.subscribed": "Thanks for subscribing!",
            "message.action.resubscribed": "You're subscribed to notifications",
            "message.action.unsubscribed":
              "You won't receive notifications again",
            "message.action.subscribing": "Subscribing...",
            "dialog.main.title": "Manage Site Notifications",
            "dialog.main.button.subscribe": "SUBSCRIBE",
            "dialog.main.button.unsubscribe": "UNSUBSCRIBE",
            "dialog.blocked.title": "Unblock Notifications",
            "dialog.blocked.message":
              "Follow these instructions to allow notifications:",
          },
        },

        autoRegister: false,
      });

      // console.log("OneSignal Init");

      // console.log(
      //   process.env
      //     .NEXT_PUBLIC_ONESIGNAL_APP_ID
      // );

    };

    init();

  }, []);

  return null;
}