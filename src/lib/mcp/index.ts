import { auth, defineMcp } from "@lovable.dev/mcp-js";

import listShops from "./tools/list-shops";
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
    "Ferramentas da plataforma BarberLink. Use list_shops para as barbearias, seus links e planos. Use list_services para preços, horários e links; list_barbers para a equipe; list_appointments para a agenda; create_appointment para marcar e cancel_appointment para cancelar.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listShops,
    listServices,
    listBarbers,
    listClients,
    listAppointments,
    createAppointment,
    cancelAppointment,
  ] as unknown as Parameters<typeof defineMcp>[0]["tools"],
});
