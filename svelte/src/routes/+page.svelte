<script lang="ts">
    import ReplaceConfirmationModal from '$lib/ReplaceConfirmationModal.svelte';
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
        </tr>
    </tbody>
</table>
