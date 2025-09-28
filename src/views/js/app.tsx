export function App() {
  return (
    <>
      <div className="m-1">
        <table className="table-responsive table-borderless table">
          <tbody>
            <tr>
              <td>
                <button
                  className="btn btn-success btn-lg"
                  disabled
                  id="logSleepButton"
                  type="button"
                >
                  Log sleep entry
                </button>
              </td>
            </tr>
            <tr>
              <td>
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
                <div
                  className="modal fade"
                  id="confirmationModal"
                  tabIndex={-1}
                >
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
              </td>
            </tr>
            <tr>
              <td>
                <div id="text">Getting last sleep log...</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <script
        crossOrigin="anonymous"
        integrity="sha384-geWF76RCwLtnZ8qwWowPQNguL3RmwHVBC9FhGdlKrxdiJJigb/j/68SIy3Te4Bkz"
        src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"
      />
    </>
  );
}
