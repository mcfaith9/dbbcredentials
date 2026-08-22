  <script setup lang="ts">
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
  } from '@/components/ui/dialog'
  import { Button } from '@/components/ui/button'
  import { AlertTriangle, Trash2 } from '@lucide/vue'

  interface Props {
    open: boolean
    title?: string
    description?: string
    itemName?: string
    itemCount?: number
    confirmText?: string
    cancelText?: string
    loading?: boolean
    destructive?: boolean
  }

  withDefaults(defineProps<Props>(), {
    title: 'Delete Item?',
    description: 'Are you sure you want to proceed? This action cannot be easily undone.',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    loading: false,
    destructive: true,
  })

  const emit = defineEmits<{
    (e: 'update:open', val: boolean): void
    (e: 'confirm'): void
    (e: 'cancel'): void
  }>()

  function handleOpenChange(val: boolean) {
    emit('update:open', val)
    if (!val) {
      emit('cancel')
    }
  }

  function handleConfirm() {
    emit('confirm')
  }

  function handleCancel() {
    emit('update:open', false)
    emit('cancel')
  }
  </script>

  <template>
    <Dialog :open="open" @update:open="handleOpenChange">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <div class="flex items-center gap-3 mb-1">
            <div
              class="p-2.5 rounded-xl shrink-0"
              :class="destructive ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'"
            >
              <AlertTriangle v-if="destructive" class="w-5 h-5" />
              <Trash2 v-else class="w-5 h-5" />
            </div>
            <div>
              <DialogTitle>{{ title }}</DialogTitle>
            </div>
          </div>
          <DialogDescription class="pt-1">
            <template v-if="description">
              {{ description }}
            </template>
            <template v-else-if="itemName">
              Are you sure you want to delete <strong class="font-semibold text-foreground">"{{ itemName }}"</strong>? This action cannot be easily undone.
            </template>
            <template v-else-if="itemCount && itemCount > 1">
              Are you sure you want to delete these <strong class="font-semibold text-foreground">{{ itemCount }} items</strong>? This action cannot be easily undone.
            </template>
            <template v-else>
              Are you sure you want to delete this item? This action cannot be easily undone.
            </template>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter class="mt-4 gap-2">
          <Button
            type="button"
            variant="outline"
            class="rounded-xl"
            :disabled="loading"
            @click="handleCancel"
          >
            {{ cancelText }}
          </Button>
          <Button
            type="button"
            :variant="destructive ? 'destructive' : 'default'"
            class="rounded-xl shadow-xs"
            :disabled="loading"
            @click="handleConfirm"
          >
            <Trash2 v-if="destructive" class="w-4 h-4 mr-1.5" />
            {{ confirmText }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </template>
