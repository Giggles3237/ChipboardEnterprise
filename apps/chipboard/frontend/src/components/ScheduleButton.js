import { PopupButton } from "react-calendly";

export default function ScheduleButton({
  stockNumber,
  clientLastName,
  advisorLastName,
  advisorName,
  advisorEmail
}) {
  return (
    <PopupButton
      url="https://calendly.com/bmwofpittsburghfandi"
      text="Schedule"
      rootElement={document.getElementById("root")}
      prefill={{
        name: advisorName,        // Advisor's name goes here
        email: advisorEmail,      // Advisor's email goes here
        customAnswers: {
          a1: stockNumber,        // Stock Number
          a2: clientLastName,     // Client Last Name
          a6: advisorLastName     // Advisor Last Name
        }
      }}
    />
  );
}
