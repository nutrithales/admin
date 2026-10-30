import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MarathonDashboard from "./marathon-dashboard";
export const metadata = { title: "Minha Maratona | Sofia" };
export default async function Page(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect("/paciente/login");
 if(user.id!=="856fb8c0-8972-456e-8cb5-6602a25faeee")redirect("/paciente");
 return <MarathonDashboard/>;
}
