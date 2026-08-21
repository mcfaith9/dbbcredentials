<script setup lang="ts">
import { ref, type HTMLAttributes } from "vue"
import { useRouter } from "vue-router"
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAuth } from "@/composables/useAuth"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()

const router = useRouter()
const { signup, loginWithGithub } = useAuth()

const name = ref("")
const email = ref("")
const password = ref("")
const confirmPassword = ref("")
const error = ref("")
const isLoading = ref(false)

function handleSubmit() {
  error.value = ""
  isLoading.value = true

  setTimeout(() => {
    const result = signup(name.value, email.value, password.value, confirmPassword.value)
    isLoading.value = false

    if (result.success) {
      router.push('/dashboard')
    } else {
      error.value = result.error || "Registration failed. Please try again."
    }
  }, 400)
}

function handleGithubSignup() {
  error.value = ""
  isLoading.value = true
  setTimeout(() => {
    loginWithGithub()
    isLoading.value = false
    router.push('/dashboard')
  }, 400)
}
</script>

<template>
  <form :class="cn('flex flex-col gap-6', props.class)" @submit.prevent="handleSubmit">
    <FieldGroup>
      <div class="flex flex-col items-center gap-1 text-center">
        <h1 class="text-2xl font-bold">
          Create your account
        </h1>
        <p class="text-muted-foreground text-sm text-balance">
          Fill in the form below to create your account
        </p>
      </div>

      <div
        v-if="error"
        class="bg-destructive/15 text-destructive rounded-lg border border-destructive/20 p-3 text-xs font-medium text-center"
      >
        {{ error }}
      </div>

      <Field>
        <FieldLabel for="name">
          Full Name
        </FieldLabel>
        <Input
          id="name"
          v-model="name"
          type="text"
          placeholder="John Doe"
          required
        />
      </Field>

      <Field>
        <FieldLabel for="email">
          Email
        </FieldLabel>
        <Input
          id="email"
          v-model="email"
          type="email"
          placeholder="m@example.com"
          required
        />
        <FieldDescription>
          We'll use this to contact you. We will not share your email with anyone else.
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel for="password">
          Password
        </FieldLabel>
        <Input
          id="password"
          v-model="password"
          type="password"
          required
        />
        <FieldDescription>
          Must be at least 6 characters long.
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel for="confirm-password">
          Confirm Password
        </FieldLabel>
        <Input
          id="confirm-password"
          v-model="confirmPassword"
          type="password"
          required
        />
        <FieldDescription>Please confirm your password.</FieldDescription>
      </Field>

      <Field>
        <Button type="submit" class="w-full" :disabled="isLoading">
          <span v-if="isLoading" class="inline-block animate-spin mr-2">⏳</span>
          {{ isLoading ? 'Creating Account...' : 'Create Account' }}
        </Button>
      </Field>

      <FieldSeparator>Or continue with</FieldSeparator>

      <Field>
        <Button
          variant="outline"
          type="button"
          class="w-full"
          :disabled="isLoading"
          @click="handleGithubSignup"
        >
          <svg aria-hidden="true" class="size-[18px]" viewBox="0 0 256 262" xmlns="http://www.w3.org/2000/svg"><path d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" fill="#4285F4"></path><path d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" fill="#34A853"></path><path d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z" fill="#FBBC05"></path><path d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" fill="#EB4335"></path></svg>
          sign up with Google Account
        </Button>

        <FieldDescription class="px-6 text-center mt-2">
          Already have an account?
          <router-link to="/login" class="font-medium underline underline-offset-4 hover:text-primary">
            Sign in
          </router-link>
        </FieldDescription>
      </Field>
    </FieldGroup>
  </form>
</template>

