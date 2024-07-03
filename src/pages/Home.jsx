import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useCookies } from 'react-cookie';
import axios from 'axios';
import { Header } from '../components/Header';
import { url } from '../const';
import './home.scss';
import PropTypes from 'prop-types';

export const Home = () => {
  const [isDoneDisplay, setIsDoneDisplay] = useState('todo');
  const [lists, setLists] = useState([]);
  const [selectListId, setSelectListId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [cookies] = useCookies();

  const handleIsDoneDisplayChange = e => setIsDoneDisplay(e.target.value);

  const handleSelectList = useCallback(
    id => {
      const numId = typeof id === 'string' ? id : Number(id);
      console.log('Selected List ID:', numId);
      setSelectListId(numId);
      axios
        .get(`${url}/lists/${id}/tasks`, {
          headers: {
            authorization: `Bearer ${cookies.token}`,
          },
        })
        .then(res => {
          setTasks(res.data.tasks);
        })
        .catch(err => {
          setErrorMessage(`タスクの取得に失敗しました。${err}`);
        });
    },
    [cookies.token],
  );

  const handleKeyDown = useCallback(
    (event, index) => {
      const listCount = lists.length;
      let newIndex;

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          newIndex = (index + 1) % listCount;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          newIndex = (index - 1 + listCount) % listCount;
          break;
        default:
          return;
      }

      handleSelectList(lists[newIndex].id);
      event.preventDefault();

      const newTab = document.querySelector(
        `.list-tab-item[aria-selected="true"]`,
      );
      if (newTab) {
        newTab.focus();
      }
    },
    [lists, handleSelectList],
  );

  useEffect(() => {
    axios
      .get(`${url}/lists`, {
        headers: {
          authorization: `Bearer ${cookies.token}`,
        },
      })
      .then(res => {
        setLists(res.data);
      })
      .catch(err => {
        setErrorMessage(`リストの取得に失敗しました。${err}`);
      });
  }, [cookies.token]);

  useEffect(() => {
    const listId = lists[0]?.id;
    if (typeof listId !== 'undefined') {
      handleSelectList(listId);
    }
  }, [lists, handleSelectList]);

  useEffect(() => {
    const activeElement = document.querySelector(
      '.list-tab-item[aria-selected="true"]',
    );
    if (activeElement) {
      activeElement.focus();
    }
  }, [selectListId]);

  return (
    <div>
      <Header />
      <main className="taskList">
        <p className="error-message">{errorMessage}</p>
        <div>
          <div className="list-header">
            <h2>リスト一覧</h2>
            <div className="list-menu">
              <p>
                <Link to="/list/new">リスト新規作成</Link>
              </p>
              <p>
                <Link to={`/lists/${selectListId}/edit`}>
                  選択中のリストを編集
                </Link>
              </p>
            </div>
          </div>
          <ul className="list-tab" role="tablist">
            {lists.map((list, index) => {
              const isActive = list.id === selectListId;
              return (
                <li
                  key={list.id}
                  role="tab"
                  tabIndex={isActive ? 0 : -1}
                  aria-selected={isActive}
                  className={`list-tab-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleSelectList(list.id)}
                  onKeyDown={e => handleKeyDown(e, index)}
                >
                  {list.title}
                </li>
              );
            })}
          </ul>
          <div className="tasks">
            <div className="tasks-header">
              <h2>タスク一覧</h2>
              <Link to="/task/new">タスク新規作成</Link>
            </div>
            <div className="display-select-wrapper">
              <select
                onChange={handleIsDoneDisplayChange}
                className="display-select"
              >
                <option value="todo">未完了</option>
                <option value="done">完了</option>
              </select>
            </div>
            <Tasks
              tasks={tasks}
              selectListId={selectListId}
              isDoneDisplay={isDoneDisplay}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

// 表示するタスク
const Tasks = props => {
  const { tasks, selectListId, isDoneDisplay } = props;
  if (tasks === null) return <></>;

  if (isDoneDisplay == 'done') {
    return (
      <ul style={{ display: 'flex', justifyContent: 'center' }}>
        {tasks
          .filter(task => {
            return task.done === true;
          })
          .map((task, key) => (
            <li key={key} className="task-item" style={{ textAlign: 'center' }}>
              <Link
                to={`/lists/${selectListId}/tasks/${task.id}`}
                className="task-item-link"
              >
                <h2>{task.title}</h2>
                <br />
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div>期限 :</div>
                  <div>{formatDate(task.limit)}</div>
                </div>
              </Link>
            </li>
          ))}
      </ul>
    );
  }

  return (
    <ul>
      {tasks
        .filter(task => {
          return task.done === false;
        })
        .map((task, key) => (
          <li key={key} className="task-item">
            <Link
              to={`/lists/${selectListId}/tasks/${task.id}`}
              className="task-item-link"
            >
              <h2>{task.title}</h2>
              <br />
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div>期限 :</div>
                <div>{formatDate(task.limit)}</div>
              </div>
              <br />
              <div style={{ display: 'flex' }}>
                <div>残り日時 : </div>
                <div>{getRemainingTime(task.limit)}</div>
              </div>
            </Link>
          </li>
        ))}
    </ul>
  );
};

Tasks.propTypes = {
  tasks: PropTypes.array,
  selectListId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  isDoneDisplay: PropTypes.string,
};

function formatDate(dateString) {
  const date = new Date(dateString);
  date.setHours(date.getHours() - 9);
  return `${date.getFullYear()}年${(date.getMonth() + 1).toString().padStart(2, '0')}月${date.getDate().toString().padStart(2, '0')}日${
    date.getHours() < 10 ? '0' : ''
  }${date.getHours()}:${date.getMinutes() < 10 ? '0' : ''}${date.getMinutes()}`;
}

function getRemainingTime(dateString) {
  const now = new Date();
  const limit = new Date(dateString);
  limit.setHours(limit.getHours() - 9);

  const diff = limit - now;
  if (diff <= 0) return '期限切れ';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  let result = '';
  if (days > 0) result += `${days}日 `;
  if (hours > 0) result += `${hours}時間 `;
  result += `${minutes}分`;

  return result;
}
