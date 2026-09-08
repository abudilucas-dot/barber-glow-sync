-- O painel precisa editar e excluir clientes da própria barbearia.
-- As policies "Owners update/delete clients" continuam sendo a barreira de isolamento.
GRANT UPDATE, DELETE ON TABLE public.clients TO authenticated;
