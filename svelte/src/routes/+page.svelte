<script lang="ts">
    import { onMount } from 'svelte';
    import ReplaceConfirmationModal from '$lib/ReplaceConfirmationModal.svelte';
    import type { PageData } from './$types';
    export let data: PageData;
    onMount(async () => {
        console.log('mounted')
    });
</script>

<table class="table table-responsive table-borderless">
    <tbody>
        <tr>
            <td>
                <button id="logSleepButton" class="btn btn-success btn-lg" type="button" disabled
                    >Log sleep entry</button
                >
            </td>
        </tr>
        <tr>
            <td>
                <button
                    id="replaceConfirmationButton"
                    class="btn btn-primary btn-lg"
                    type="button"
                    data-toggle="modal"
                    data-target="#confirmationModal"
                    disabled>Replace last sleep entry include</button
                >
                <ReplaceConfirmationModal />
            </td>
        </tr>
        <tr>
            <td id="text">Getting last sleep log...</td>
            <div>{JSON.stringify(data)}</div>
        </tr>
    </tbody>
</table>
