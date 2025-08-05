# Correção de Endpoints de Roadmap

## Problema
Os endpoints de roadmap estavam usando `/roadmaps` (plural) quando deveriam usar `/me/roadmap` (singular).

## Correções Implementadas

### ✅ **Endpoints Alterados em RoadmapService.ts:**

1. **Endpoint Principal**: `/roadmaps` → `/me/roadmap`
2. **Endpoint por Data**: `/roadmaps/${date}` → `/me/roadmap/${date}`
3. **Atividades de Roadmap**: `/roadmaps/${roadmapId}/activities` → `/me/roadmap/${roadmapId}/activities`
4. **Equipamentos de Atividade**: `/roadmaps/activities/${activityId}/equipment` → `/me/roadmap/activities/${activityId}/equipment`
5. **Questões de Equipamento**: `/roadmaps/activities/${activityId}/equipment/${equipmentId}/questions` → `/me/roadmap/activities/${activityId}/equipment/${equipmentId}/questions`
6. **Respostas de Equipamento**: `/roadmaps/activities/${activityId}/equipment/${equipmentId}/answers` → `/me/roadmap/activities/${activityId}/equipment/${equipmentId}/answers`
7. **Notas de Atividade**: `/roadmaps/activities/${activityId}/notes` → `/me/roadmap/activities/${activityId}/notes`
8. **Status de Atividade**: `/roadmaps/activities/${activityId}/status` → `/me/roadmap/activities/${activityId}/status`

### ✅ **Endpoints Alterados em SyncService.ts:**

1. **Upload de Imagens**: `/roadmaps/activities/${activityId}/equipment/${equipmentId}/images` → `/me/roadmap/activities/${activityId}/equipment/${equipmentId}/images`

## Arquivos Modificados

1. `src/Services/RoadmapService.ts` - 8 endpoints alterados
2. `src/Services/SyncService.ts` - 1 endpoint alterado

## Como Testar

1. Acesse a tela de Roadmap
2. Verifique se os dados são carregados corretamente
3. Teste as funcionalidades de:
   - Visualização de atividades
   - Submissão de respostas
   - Adição de notas
   - Atualização de status
   - Upload de imagens

## Impacto

- ✅ Todos os endpoints de roadmap agora usam o padrão correto `/me/roadmap`
- ✅ Melhor consistência com outros endpoints que usam `/me/`
- ✅ Endpoints agora refletem que são específicos do usuário logado 