<script lang="ts">
  import Chat from '$lib/components/Chat.svelte';
  let { data } = $props();
</script>

<Chat user={data.user} questionsRemaining={data.questionsRemaining} />
