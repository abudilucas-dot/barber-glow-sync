import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listBarbers from "./tools/list-barbers";
import listServices from "./tools/list-services";
import listClients from "./tools/list-clients";
import listAppointments from "./tools/list-appointments";
import createAppointment from "./tools/create-appointment";
import cancelAppointment from "./tools/cancel-appointment";

const projectRef =
  import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "barber-hub-pro",
  title: "Barber Hub Pro",
  version: "0.1.0",
  instructions:
    "Ferramentas da barbearia Navalha de Ouro. Use list_services para preços, horários e links; list_barbers para a equipe; list_appointments para a agenda; create_appointment para marcar e cancel_appointment para cancelar.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listServices,
    listBarbers,
    listClients,
    listAppointments,
    createAppointment,
    cancelAppointment,
  ],
});
