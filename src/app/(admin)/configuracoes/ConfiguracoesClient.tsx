"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldGroup } from "@/components/ui/Input";
import { useToast } from "@/contexts/ToastContext";
import { saveConfiguracoesAction } from "@/services/configuracoes.actions";
import type { Tables } from "@/types/database.types";

const fileInputClasses =
  "block w-full text-sm text-muted file:mr-4 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-ink-deep hover:file:bg-brand-dark hover:file:text-white file:cursor-pointer cursor-pointer";

export function ConfiguracoesClient({
  config,
  logoUrl,
}: {
  config: Tables<"configuracoes_consultorio"> | null;
  logoUrl: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const redes = (config?.redes_sociais as Record<string, string>) ?? {};

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);

    setSaving(true);
    const result = await saveConfiguracoesAction(formData);
    setSaving(false);

    toast({
      kind: result.success ? "success" : "error",
      title: result.message,
    });
    if (result.success) router.refresh();
  }

  return (
    <div>
      <PageHeader title="Configurações" description="Dados do consultório exibidos na plataforma." />

      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Identidade do consultório</CardTitle>
              <CardDescription>Nome e logo utilizados na plataforma.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FieldGroup>
              <Label htmlFor="nome_consultorio">Nome do consultório</Label>
              <Input
                id="nome_consultorio"
                name="nome_consultorio"
                defaultValue={config?.nome_consultorio ?? ""}
                placeholder="Nutri Thales Rosa"
              />
            </FieldGroup>

            <FieldGroup>
              <Label htmlFor="logo">Logo</Label>
              {logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo atual" className="mb-3 h-14 w-auto rounded-md border border-border object-contain p-2" />
              )}
              <input id="logo" name="logo" type="file" accept="image/*" className={fileInputClasses} />
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Contato</CardTitle>
              <CardDescription>Endereço, WhatsApp e e-mail de contato.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FieldGroup>
              <Label htmlFor="endereco">Endereço</Label>
              <Input id="endereco" name="endereco" defaultValue={config?.endereco ?? ""} />
            </FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldGroup>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" name="whatsapp" defaultValue={config?.whatsapp ?? ""} placeholder="(41) 99999-9999" />
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" defaultValue={config?.email ?? ""} />
              </FieldGroup>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Redes sociais</CardTitle>
              <CardDescription>Links exibidos no site e materiais da plataforma.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup>
              <Label htmlFor="instagram">Instagram</Label>
              <Input id="instagram" name="instagram" defaultValue={redes.instagram ?? ""} placeholder="https://instagram.com/..." />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="facebook">Facebook</Label>
              <Input id="facebook" name="facebook" defaultValue={redes.facebook ?? ""} placeholder="https://facebook.com/..." />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="tiktok">TikTok</Label>
              <Input id="tiktok" name="tiktok" defaultValue={redes.tiktok ?? ""} placeholder="https://tiktok.com/@..." />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="youtube">YouTube</Label>
              <Input id="youtube" name="youtube" defaultValue={redes.youtube ?? ""} placeholder="https://youtube.com/@..." />
            </FieldGroup>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={saving} size="lg">
            Salvar configurações
          </Button>
        </div>
      </form>
    </div>
  );
}
