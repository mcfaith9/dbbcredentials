<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useVault } from '@/composables/useVault'
import type { VaultNavFilter } from '@/types'
import {
  LayoutDashboard,
  KeyRound,
  Mail,
  Share2,
  Building2,
  Monitor,
  Server,
  Wifi,
  Globe,
  HardDrive,
  FileCode,
  FileText,
  UserRoundCheck,
  Folder,
  Tag,
  Star,
  ShieldCheck,
  Sparkles,
  Download,
  Trash2,
  Settings,
  Plus,
} from '@lucide/vue'

const emit = defineEmits<{
  (e: 'add-item'): void
  (e: 'open-generator'): void
}>()

const { user } = useAuth()
const {
  counts,
  selectedFilter,
  selectedCategory,
  selectedTag,
  securityReport,
  expirationAlerts,
  setFilter,
} = useVault()

const currentUsername = computed(() => user.value?.username || 'admin')

function handleNavClick(filter: VaultNavFilter) {
  setFilter(filter, null, null)
}
</script>

<template>
  <aside class="w-64 border-r border-border bg-sidebar flex flex-col h-full shrink-0 select-none text-sidebar-foreground">
    <!-- Sidebar Header: Brand & App Title -->
    <div class="p-4 border-b border-sidebar-border flex items-center justify-between">
      <div class="flex items-center gap-2.5 min-w-0">
        <div>
          <img src="@/assets/img/dbblogo.png" class="w-8 rounded-full" />
        </div>
        <div class="min-w-0">
          <h1 class="text-sm font-bold tracking-tight text-sidebar-foreground truncate">DBB Vault</h1>
          <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Company Vault</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick + Add Item Button -->
    <div class="p-3 border-b border-sidebar-border">
      <button
        @click="emit('add-item')"
        class="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
      >
        <Plus class="w-4 h-4" />
        <span>New Credential (Ctrl+N)</span>
      </button>
    </div>

    <!-- Sidebar Scrollable Navigation with Company Hierarchy -->
    <div class="flex-1 overflow-y-auto p-3 space-y-5">
      <!-- 0. Overview Dashboard -->
      <div class="space-y-0.5">
        <button
          @click="handleNavClick('dashboard')"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium"
          :class="
            selectedFilter === 'dashboard'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-bold shadow-xs'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <LayoutDashboard class="w-4 h-4 text-primary" />
            <span>Dashboard</span>
          </div>
        </button>
      </div>

      <!-- ================= 1. CREDENTIALS ================= -->
      <div class="space-y-0.5">
        <span class="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
          Credentials
        </span>

        <!-- All Items -->
        <button
          @click="handleNavClick('all')"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium"
          :class="
            selectedFilter === 'all' && !selectedCategory && !selectedTag
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-bold shadow-xs'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <KeyRound class="w-4 h-4 text-primary" />
            <span>All Records</span>
          </div>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] bg-sidebar-border/60 text-muted-foreground font-mono">
            {{ counts.all }}
          </span>
        </button>

        <!-- Passwords / Logins -->
        <button
          @click="handleNavClick('passwords')"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium"
          :class="
            selectedFilter === 'passwords'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-bold shadow-xs'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <KeyRound class="w-4 h-4 text-blue-500" />
            <span>Passwords</span>
          </div>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] bg-sidebar-border/60 text-muted-foreground font-mono">
            {{ counts.passwords }}
          </span>
        </button>

        <!-- Email Accounts -->
        <button
          @click="handleNavClick('email_accounts')"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium"
          :class="
            selectedFilter === 'email_accounts'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-bold shadow-xs'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <Mail class="w-4 h-4 text-emerald-500" />
            <span>Email Accounts</span>
          </div>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] bg-sidebar-border/60 text-muted-foreground font-mono">
            {{ counts.email_accounts }}
          </span>
        </button>

        <!-- Social Accounts -->
        <button
          @click="handleNavClick('social_accounts')"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium"
          :class="
            selectedFilter === 'social_accounts'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-bold shadow-xs'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <Share2 class="w-4 h-4 text-pink-500" />
            <span>Social Accounts</span>
          </div>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] bg-sidebar-border/60 text-muted-foreground font-mono">
            {{ counts.social_accounts }}
          </span>
        </button>

        <!-- Company Accounts -->
        <button
          @click="handleNavClick('company_accounts')"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium"
          :class="
            selectedFilter === 'company_accounts'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-bold shadow-xs'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <Building2 class="w-4 h-4 text-indigo-500" />
            <span>Company Accounts</span>
          </div>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] bg-sidebar-border/60 text-muted-foreground font-mono">
            {{ counts.company_accounts }}
          </span>
        </button>
      </div>

      <!-- ================= 2. INFRASTRUCTURE ================= -->
      <div class="space-y-0.5">
        <span class="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
          Infrastructure
        </span>

        <!-- PC / Computers -->
        <button
          @click="handleNavClick('pc_computers')"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium"
          :class="
            selectedFilter === 'pc_computers'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-bold shadow-xs'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <Monitor class="w-4 h-4 text-teal-500" />
            <span>PC / Computers</span>
          </div>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] bg-sidebar-border/60 text-muted-foreground font-mono">
            {{ counts.pc_computers }}
          </span>
        </button>

        <!-- Servers -->
        <button
          @click="handleNavClick('servers')"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium"
          :class="
            selectedFilter === 'servers'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-bold shadow-xs'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <Server class="w-4 h-4 text-purple-500" />
            <span>Servers</span>
          </div>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] bg-sidebar-border/60 text-muted-foreground font-mono">
            {{ counts.servers }}
          </span>
        </button>

        <!-- Wi-Fi Networks -->
        <button
          @click="handleNavClick('wifi')"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium"
          :class="
            selectedFilter === 'wifi'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-bold shadow-xs'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <Wifi class="w-4 h-4 text-cyan-500" />
            <span>Wi-Fi Networks</span>
          </div>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] bg-sidebar-border/60 text-muted-foreground font-mono">
            {{ counts.wifi }}
          </span>
        </button>
      </div>

      <!-- ================= 3. ASSETS ================= -->
      <div class="space-y-0.5">
        <span class="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
          Assets
        </span>

        <!-- Domains -->
        <button
          @click="handleNavClick('domains')"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium"
          :class="
            selectedFilter === 'domains'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-bold shadow-xs'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <Globe class="w-4 h-4 text-amber-500" />
            <span>Domains</span>
          </div>
          <div class="flex items-center gap-1">
            <span
              v-if="expirationAlerts.domains.length > 0"
              class="w-2 h-2 rounded-full bg-amber-500"
              title="Expiring soon"
            ></span>
            <span class="px-1.5 py-0.5 rounded-md text-[10px] bg-sidebar-border/60 text-muted-foreground font-mono">
              {{ counts.domains }}
            </span>
          </div>
        </button>

        <!-- Web Hosting -->
        <button
          @click="handleNavClick('hosting')"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium"
          :class="
            selectedFilter === 'hosting'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-bold shadow-xs'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <HardDrive class="w-4 h-4 text-orange-500" />
            <span>Web Hosting</span>
          </div>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] bg-sidebar-border/60 text-muted-foreground font-mono">
            {{ counts.hosting }}
          </span>
        </button>

        <!-- Software Licenses -->
        <button
          @click="handleNavClick('software_licenses')"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium"
          :class="
            selectedFilter === 'software_licenses'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-bold shadow-xs'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <FileCode class="w-4 h-4 text-violet-500" />
            <span>Software Licenses</span>
          </div>
          <div class="flex items-center gap-1">
            <span
              v-if="expirationAlerts.licenses.length > 0"
              class="w-2 h-2 rounded-full bg-amber-500"
              title="Expiring soon"
            ></span>
            <span class="px-1.5 py-0.5 rounded-md text-[10px] bg-sidebar-border/60 text-muted-foreground font-mono">
              {{ counts.software_licenses }}
            </span>
          </div>
        </button>
      </div>

      <!-- ================= 4. ORGANIZATION ================= -->
      <div class="space-y-0.5">
        <span class="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
          Organization
        </span>

        <!-- Secure Notes -->
        <button
          @click="handleNavClick('notes')"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium"
          :class="
            selectedFilter === 'notes'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-bold shadow-xs'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <FileText class="w-4 h-4 text-amber-500" />
            <span>Secure Notes</span>
          </div>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] bg-sidebar-border/60 text-muted-foreground font-mono">
            {{ counts.notes }}
          </span>
        </button>

        <!-- Employee Identities -->
        <button
          @click="handleNavClick('identities')"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium"
          :class="
            selectedFilter === 'identities'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-bold shadow-xs'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <UserRoundCheck class="w-4 h-4 text-blue-400" />
            <span>Employees</span>
          </div>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] bg-sidebar-border/60 text-muted-foreground font-mono">
            {{ counts.identities }}
          </span>
        </button>

        <!-- Categories -->
        <button
          @click="handleNavClick('categories')"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium"
          :class="
            selectedFilter === 'categories'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-bold shadow-xs'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <Folder class="w-4 h-4 text-yellow-500" />
            <span>Categories</span>
          </div>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] bg-sidebar-border/60 text-muted-foreground font-mono">
            {{ counts.categories }}
          </span>
        </button>

        <!-- Tags -->
        <button
          @click="handleNavClick('tags')"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium"
          :class="
            selectedFilter === 'tags'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-bold shadow-xs'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <Tag class="w-4 h-4 text-emerald-400" />
            <span>Tags</span>
          </div>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] bg-sidebar-border/60 text-muted-foreground font-mono">
            {{ counts.tags }}
          </span>
        </button>
      </div>

      <!-- ================= 5. SYSTEM ================= -->
      <div class="space-y-0.5 pt-2 border-t border-sidebar-border">
        <span class="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
          System
        </span>

        <!-- Favorites -->
        <button
          @click="handleNavClick('favorites')"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium"
          :class="
            selectedFilter === 'favorites'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-bold shadow-xs'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <Star class="w-4 h-4 text-amber-500" :class="{ 'fill-amber-500': selectedFilter === 'favorites' }" />
            <span>Favorites</span>
          </div>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] bg-sidebar-border/60 text-muted-foreground font-mono">
            {{ counts.favorites }}
          </span>
        </button>

        <!-- Security Audit -->
        <button
          @click="handleNavClick('security')"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium"
          :class="
            selectedFilter === 'security'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-bold shadow-xs'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <ShieldCheck class="w-4 h-4 text-emerald-500" />
            <span>Security Health</span>
          </div>
          <span
            v-if="securityReport.weakCount > 0"
            class="px-1.5 py-0.5 rounded-md text-[10px] bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold"
          >
            {{ securityReport.weakCount }} weak
          </span>
          <span
            v-else
            class="px-1.5 py-0.5 rounded-md text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold"
          >
            {{ securityReport.score }}%
          </span>
        </button>

        <!-- Generator Tool -->
        <button
          @click="emit('open-generator')"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          <div class="flex items-center gap-2.5">
            <Sparkles class="w-4 h-4 text-indigo-400" />
            <span>Generator Tool</span>
          </div>
        </button>

        <!-- Backup & Restore -->
        <button
          @click="handleNavClick('backup')"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium"
          :class="
            selectedFilter === 'backup'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-bold shadow-xs'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <Download class="w-4 h-4 text-primary" />
            <span>Backup & Restore</span>
          </div>
        </button>

        <!-- Trash -->
        <button
          @click="handleNavClick('trash')"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium"
          :class="
            selectedFilter === 'trash'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-bold shadow-xs'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <Trash2 class="w-4 h-4 text-rose-500" />
            <span>Trash</span>
          </div>
          <span
            v-if="counts.trash > 0"
            class="px-1.5 py-0.5 rounded-md text-[10px] bg-rose-500/15 text-rose-600 dark:text-rose-400 font-mono"
          >
            {{ counts.trash }}
          </span>
        </button>

        <!-- Settings -->
        <button
          @click="handleNavClick('settings')"
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium"
          :class="
            selectedFilter === 'settings'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-bold shadow-xs'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          "
        >
          <div class="flex items-center gap-2.5">
            <Settings class="w-4 h-4 text-muted-foreground" />
            <span>Settings</span>
          </div>
        </button>
      </div>
    </div>

    <!-- Sidebar Footer: Current User & Lock CTA -->
    <div class="p-3 border-t border-sidebar-border bg-sidebar-accent/30 flex items-center justify-between">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
          {{ currentUsername.slice(0, 2) }}
        </div>
        <div class="min-w-0">
          <span class="text-xs font-bold text-sidebar-foreground truncate block">{{ currentUsername }}</span>
          <span class="text-[10px] text-muted-foreground block truncate">info@dmbbcontractor.com</span>
        </div>
      </div>
    </div>
  </aside>
</template>
