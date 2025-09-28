const LogSleepButton: React.FC = () => (
  <button
    className="btn btn-success btn-lg"
    disabled
    id="logSleepButton"
    type="button"
  >
    Log sleep entry
  </button>
);

const ReplaceConfirmationButton: React.FC = () => (
  <button
    className="btn btn-primary btn-lg"
    data-bs-target="#confirmationModal"
    data-bs-toggle="modal"
    disabled
    id="replaceConfirmationButton"
    type="button"
  >
    Replace last sleep entry
  </button>
);

const ConfirmationModal: React.FC = () => (
  <div className="modal fade" id="confirmationModal" tabIndex={-1}>
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title" id="confirmationModalLabel">
            Confirm replace
          </h5>
          <button
            aria-label="Close"
            className="btn-close"
            data-bs-dismiss="modal"
            type="button"
          />
        </div>
        <div className="modal-body">
          Are you sure you want to replace the last sleep entry?
        </div>
        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            data-bs-dismiss="modal"
            type="button"
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            data-bs-dismiss="modal"
            id="replaceLastSleepButton"
            type="button"
          >
            Replace
          </button>
        </div>
      </div>
    </div>
  </div>
);

const Text: React.FC = () => <div id="text">Getting last sleep log...</div>;

const LayoutTable: React.FC = () => (
  <table className="table-responsive table-borderless table">
    <tbody>
      <tr>
        <td>
          <LogSleepButton />
        </td>
      </tr>
      <tr>
        <td>
          <ReplaceConfirmationButton />
          <ConfirmationModal />
        </td>
      </tr>
      <tr>
        <td>
          <Text />
        </td>
      </tr>
    </tbody>
  </table>
);

export const App = () => (
  <div className="m-1">
    <LayoutTable />
  </div>
);
