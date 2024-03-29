import React, { useState } from 'react';
import styled from 'styled-components';
import { useForm } from 'react-hook-form';
import isEmail from 'validator/lib/isEmail';

import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import CircularProgress from '@material-ui/core/CircularProgress';
import TextField from '@material-ui/core/TextField';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';

import Layout from '../../components/layout';
import api from '../../libs/api';

function range(length) {
  return Array.from({ length }, (_, k) => k + 1);
}

let defaults = {
  synopsis: 'Test Contract Summary',
  content: `Test Contract Content: ${Date.now()}:${Math.random()}`,
  signers: [],
};

if (process.env.NODE_ENV === 'production') {
  defaults = {};
}

export default function CreateContract() {
  const { handleSubmit, register, errors } = useForm({
    synopsis: defaults.synopsis,
    content: defaults.content,
    signers: [],
  });
  const [signerCount, setSignerCount] = useState(2);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState();

  const onSubmit = async data => {
    setCreating(true);
    setError('');

    try {
      const res = await api.put('/api/contracts', {
        synopsis: data.synopsis,
        content: data.content,
        signatures: data.signers.filter(Boolean).map(x => ({ email: x })),
      });

      setCreating(false);
      if (res.status === 200) {
        // eslint-disable-next-line no-underscore-dangle
        window.location.href = `/contracts/detail?contractId=${res.data.did}`;
      } else {
        setError(res.data.error || 'Error creating contract');
      }
    } catch (err) {
      setCreating(false);
      setError(`Error creating contract: ${err.message}`);
    }
  };

  return (
    <Layout title="Create Contract">
      <Main>
        <div className="form">
          <Typography component="h3" variant="h4" className="form-header">
            Create New Contract
          </Typography>

          <Typography component="h4" variant="h5" className="form-subheader">
            Contract Info
          </Typography>

          <form className="form-body" onSubmit={handleSubmit(onSubmit)}>
            <TextField
              label="Contract Summary"
              className="input input-synopsis"
              margin="normal"
              variant="outlined"
              fullWidth
              error={errors.synopsis && errors.synopsis.message}
              helperText={errors.synopsis ? errors.synopsis.message : ''}
              inputRef={register({ required: 'Contract description is required' })}
              InputProps={{
                disabled: creating,
                defaultValue: defaults.synopsis,
                type: 'text',
                name: 'synopsis',
                placeholder: 'Brief summary of the contract',
              }}
            />
            <TextField
              label="Contract Content"
              className="input input-content"
              margin="normal"
              variant="outlined"
              fullWidth
              multiline
              rows={10}
              rowsMax={20}
              error={errors.content && errors.content.message}
              inputRef={register({ required: 'Contract content cannot be empty' })}
              helperText={errors.content ? errors.content.message : ''}
              InputProps={{
                disabled: creating,
                defaultValue: defaults.content,
                type: 'textarea',
                name: 'content',
                placeholder: 'Pates the full text of the contract here',
              }}
            />

            <Typography component="h4" variant="h5" className="form-subheader">
              Contract Signers
            </Typography>

            <div className="signers">
              <div className="signer-inputs">
                {range(signerCount).map(i => {
                  const key = `signers[${i}]`;
                  return (
                    <TextField
                      key={key}
                      label={`Signer ${i}`}
                      className="input input-signer-email"
                      placeholder="Email to receive signing notification"
                      variant="outlined"
                      margin="normal"
                      error={errors[key] && errors[key].message}
                      helperText={errors[key] ? errors[key].message : ''}
                      inputRef={register({ required: 'Email not valid', validate: isEmail })}
                      InputProps={{
                        disabled: creating,
                        defaultValue: Array.isArray(defaults.signers) ? defaults.signers[i - 1] : undefined,
                        type: 'text',
                        name: key,
                      }}
                    />
                  );
                })}
              </div>
              <div className="signer-actions">
                <IconButton
                  type="button"
                  size="small"
                  variant="outlined"
                  color="primary"
                  disabled={creating}
                  onClick={() => setSignerCount(signerCount + 1)}>
                  <AddIcon />
                </IconButton>
                <IconButton
                  type="button"
                  size="small"
                  variant="outlined"
                  color="secondary"
                  disabled={creating}
                  onClick={() => setSignerCount(signerCount - 1)}>
                  <DeleteIcon />
                </IconButton>
              </div>
            </div>

            <Button type="submit" size="large" variant="contained" color="primary" disabled={creating}>
              {creating ? <CircularProgress size={24} /> : 'Create Contract'}
            </Button>
            {!!error && <p className="error">{error}</p>}
          </form>
        </div>
      </Main>
    </Layout>
  );
}

const Main = styled.main`
  margin: 80px 0;

  .form {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .form-subheader {
    margin: 40px 0 8px;
  }

  .form-body {
    max-width: 80%;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
  }

  .input {
  }

  .signers {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;

    .input-signer-email {
      margin-right: 32px;
      width: 240px;
    }

    .signer-actions {
      display: flex;
    }

    margin-bottom: 50px;
  }

  .error {
    color: ${props => props.theme.colors.red};
  }
`;
